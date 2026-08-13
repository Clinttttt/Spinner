import * as ImageManipulator from "expo-image-manipulator";
import { SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/**
 * A picked image, prepared for upload.
 */
export interface PreparedImage {
  uri: string;
  /** Sent as the multipart part's content type, so it must be one the API accepts. */
  contentType: string;
  fileName: string;
}

/**
 * Longest edge of a stored image, in pixels.
 *
 * The logo appears at roughly 40 points in the app header and 34 in an email, and a profile
 * photo at 40. 512 leaves room for the densest screens and for the picture to be reused
 * somewhere larger later, while turning a 4 MB camera photo into something around 100 KB.
 * Uploading the original would waste the storage allowance and make every screen that shows
 * the image slower to load, for no visible gain.
 */
const MAX_EDGE_PIXELS = 512;

/**
 * JPEG quality for photographs. High enough that a face still looks like itself.
 */
const JPEG_QUALITY = 0.85;

/**
 * Asks for a picture from the phone's library, then shrinks it ready for upload.
 *
 * Returns undefined when the person cancels, which is not an error and must not be
 * reported as one.
 *
 * @param square Crop to a square. Right for a logo tile and an avatar, both of which are
 * displayed in a square or circular frame; a non-square image would be cropped by the view
 * anyway, so it is better to let the owner choose which part survives.
 */
export async function pickImageFromLibrary(
  square: boolean,
): Promise<PreparedImage | undefined> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new ImagePermissionError(permission.canAskAgain);
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: square ? [1, 1] : undefined,
    mediaTypes: "images",
    quality: 1,
    selectionLimit: 1,
  });

  if (picked.canceled || picked.assets.length === 0) return undefined;

  return prepareForUpload(picked.assets[0]);
}

/**
 * Resizes a picked image and re-encodes it in a format the API accepts.
 */
async function prepareForUpload(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PreparedImage> {
  // PNG is kept as PNG so a logo with a transparent background stays transparent; turning it
  // into a JPEG would fill that transparency with black. Everything else becomes a JPEG,
  // which is far smaller for a photograph.
  const keepPng = (asset.mimeType ?? "").toLowerCase() === "image/png";
  const longestEdge = Math.max(asset.width, asset.height);

  const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);

  if (longestEdge > MAX_EDGE_PIXELS) {
    // Only the longer edge is given, so the aspect ratio is preserved.
    context.resize(
      asset.width >= asset.height
        ? { width: MAX_EDGE_PIXELS }
        : { height: MAX_EDGE_PIXELS },
    );
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: keepPng ? 1 : JPEG_QUALITY,
    format: keepPng ? SaveFormat.PNG : SaveFormat.JPEG,
  });

  return {
    contentType: keepPng ? "image/png" : "image/jpeg",
    fileName: keepPng ? "image.png" : "image.jpg",
    uri: saved.uri,
  };
}

/**
 * The person declined access to their photos.
 *
 * A distinct type so the screen can say something useful — including telling them to open
 * Settings when the system will no longer show the prompt.
 */
export class ImagePermissionError extends Error {
  readonly canAskAgain: boolean;

  constructor(canAskAgain: boolean) {
    super(
      canAskAgain
        ? "Spinner needs permission to open your photos."
        : "Spinner needs permission to open your photos. Enable Photos for Spinner in your phone's Settings.",
    );
    this.canAskAgain = canAskAgain;
    this.name = "ImagePermissionError";
  }
}
