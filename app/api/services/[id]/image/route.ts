import { randomUUID } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { canUseServiceImages } from "@/lib/plan-limits";
import {
  ALLOWED_IMAGE_LABEL,
  detectImageMimeType,
  imageExtensionFor,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_LABEL
} from "@/lib/image-mime";
import { prisma } from "@/lib/prisma";
import { uploadToStorage, deleteFromStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function resolveService(userId: string, serviceId: string) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, plan: true }
  });

  if (!profile) return { profile: null, service: null };

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: profile.id },
    select: { id: true, imageStorageKey: true }
  });

  return { profile, service };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: serviceId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { profile, service } = await resolveService(session.user.id, serviceId);

  if (!profile) {
    return NextResponse.json({ error: "Dados do negócio não encontrados." }, { status: 404 });
  }

  if (!canUseServiceImages(profile.plan)) {
    return NextResponse.json(
      { error: "Imagens não estão disponíveis para esta conta." },
      { status: 403 }
    );
  }

  if (!service) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhuma imagem enviada." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Imagem muito grande. Limite de ${MAX_IMAGE_SIZE_LABEL}.` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectImageMimeType(buffer);

  if (!detectedMime) {
    return NextResponse.json(
      { error: `Arquivo inválido. Envie uma imagem ${ALLOWED_IMAGE_LABEL} real.` },
      { status: 400 }
    );
  }

  const ext = imageExtensionFor(detectedMime);
  const storageKey = `services/${serviceId}/${randomUUID()}.${ext}`;

  // Sobe a nova imagem antes de apagar a antiga: se o upload falhar,
  // o item continua com a imagem atual em vez de apontar para um objeto morto.
  let imageUrl: string;
  try {
    imageUrl = await uploadToStorage(storageKey, buffer, detectedMime);
  } catch (err) {
    // name/message são não-enumeráveis nos erros do SDK; logar explícito.
    console.error("Falha ao enviar imagem para o storage.", {
      name: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : String(err)
    });
    return NextResponse.json(
      { error: "Falha ao enviar imagem. Tente novamente." },
      { status: 500 }
    );
  }

  await prisma.service.update({
    where: { id: service.id },
    data: { imageUrl, imageStorageKey: storageKey }
  });

  if (service.imageStorageKey) {
    try {
      await deleteFromStorage(service.imageStorageKey);
    } catch (err) {
      console.error("Falha ao deletar imagem anterior.", {
        key: service.imageStorageKey,
        name: err instanceof Error ? err.name : "unknown",
        message: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return NextResponse.json({ imageUrl });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id: serviceId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { profile, service } = await resolveService(session.user.id, serviceId);

  if (!profile) {
    return NextResponse.json({ error: "Dados do negócio não encontrados." }, { status: 404 });
  }

  if (!canUseServiceImages(profile.plan)) {
    return NextResponse.json(
      { error: "Imagens não estão disponíveis para esta conta." },
      { status: 403 }
    );
  }

  if (!service) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  if (!service.imageStorageKey) {
    return NextResponse.json({ error: "Este item não tem imagem." }, { status: 404 });
  }

  try {
    await deleteFromStorage(service.imageStorageKey);
  } catch (err) {
    console.error("Falha ao deletar imagem do storage.", {
      key: service.imageStorageKey,
      name: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : String(err)
    });
    return NextResponse.json(
      { error: "Falha ao remover imagem. Tente novamente." },
      { status: 500 }
    );
  }

  await prisma.service.update({
    where: { id: service.id },
    data: { imageUrl: null, imageStorageKey: null }
  });

  return NextResponse.json({ success: true });
}
