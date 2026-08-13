import { apiRequest } from "../../../api/apiClient";
import type { PreparedImage } from "./imagePicker";

/**
 * Where an uploaded image now lives.
 */
export interface UploadedMedia {
  key: string;
  /**
   * Absolute address of the image, served by the API rather than by the storage provider.
   *
   * This is what gets saved against the shop or the staff member, and it is deliberately a
   * plain public URL: the shop's logo is fetched by mail clients, which have no session and
   * cannot be given one.
   */
  url: string;
  contentType: string;
  byteSize: number;
}

/**
 * Uploads the shop's logo. Owner only, enforced by the API.
 */
export function uploadLogo(image: PreparedImage): Promise<UploadedMedia> {
  return upload("/api/media/logo", image);
}

/**
 * Uploads the signed-in person's profile photo.
 */
export function uploadProfilePhoto(
  image: PreparedImage,
): Promise<UploadedMedia> {
  return upload("/api/media/profile-photo", image);
}

function upload(path: string, image: PreparedImage): Promise<UploadedMedia> {
  const form = new FormData();

  // React Native builds the multipart part from this shape rather than from a Blob, so the
  // cast is unavoidable: the platform's FormData accepts it, the DOM type does not describe it.
  form.append("file", {
    name: image.fileName,
    type: image.contentType,
    uri: image.uri,
  } as unknown as Blob);

  return apiRequest<UploadedMedia>(path, {
    body: form,
    method: "POST",
  });
}
