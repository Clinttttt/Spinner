import { apiUpload } from "../../../api/apiClient";
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

/**
 * Sends the file itself, natively.
 *
 * The file is handed over as a URI rather than read into JavaScript first: the platform
 * streams it straight out, and a refusal comes back as a status code we can explain instead
 * of as an error that looks like a lost connection. See apiUpload.
 */
function upload(path: string, image: PreparedImage): Promise<UploadedMedia> {
  return apiUpload<UploadedMedia>(path, image.uri, {
    fieldName: "file",
    mimeType: image.contentType,
  });
}
