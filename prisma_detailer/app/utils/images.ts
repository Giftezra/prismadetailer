import { Alert } from "react-native";
import * as ExpoImagePicker from "expo-image-picker";

/**
 * Converts a local image URI to a File object for upload purposes.
 * This is necessary because the API expects File objects, but Expo ImagePicker returns URIs.
 *
 * @param {string} uri - The local URI of the image
 * @param {string} filename - The desired filename for the File object
 * @returns {Promise<File>} A Promise that resolves to a File object
 * @throws {Error} If the URI cannot be fetched or converted to a blob
 */
const uriToFile = async (uri: string, filename: string): Promise<File> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
};

/**
 * Handles camera image capture using Expo ImagePicker.
 * Requests camera permissions and launches the camera interface.
 * Processes the captured image through handleImageSelection and updates local state.
 *
 * @throws {Error} If camera permissions are denied or image processing fails
 */
const handleCameraSelection = async () => {
  try {
    // Request camera permissions
    const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Sorry, we need camera permissions to make this work!"
      );
      return;
    }

    let result = await ExpoImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      await handleImageSelection(imageUri);
    }
  } catch (error) {
    console.error("Error capturing image:", error);
    Alert.alert("Error", "Failed to capture image. Please try again.");
    throw error;
  }
};

/**
 * Handles image selection from the device's photo gallery.
 * Requests media library permissions and launches the image picker interface.
 * Updates both the newVehicle state and selectedImage state with the chosen image.
 *
 * @throws {Error} If media library permissions are denied or image selection fails
 */
const handleGallerySelection = async () => {
  try {
    // Request media library permissions
    const { status } =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }

    let result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      await handleImageSelection(imageUri);
    }
  } catch (error) {
    console.error("Error selecting image:", error);
    Alert.alert("Error", "Failed to select image. Please try again.");
    throw error;
  }
};

/**
 * Processes a selected image by storing only serializable data in Redux state.
 * Creates a timestamped filename and stores the URI (for display) and filename (for upload).
 * File objects are created only when needed for API calls to avoid Redux serialization issues.
 *
 * @param {string} imageUri - The URI of the selected image
 * @throws {Error} If image processing fails
 */
const handleImageSelection = async (imageUri: string) => {
  try {
    // Generate a filename based on timestamp
    const timestamp = Date.now();
    const filename = `vehicle_image_${timestamp}.jpg`;

    // Store only serializable data (uri and filename) in Redux state
    // File object will be created when needed for API calls
    const imageData = {
      uri: imageUri,
      filename: filename,
    };
  } catch (error) {
    console.error("Error processing image:", error);
  }
};

/**
 * Captures an image using ONLY the camera (no gallery access).
 * This ensures images are freshly taken, not selected from existing photos.
 * Used for before/after job images where freshness is critical.
 *
 * @returns {Promise<{ uri: string; type: string; filename: string } | null>} Image data or null if cancelled
 * @throws {Error} If camera permissions are denied or capture fails
 */
export const captureCameraOnlyImage = async (): Promise<{
  uri: string;
  type: string;
  filename: string;
} | null> => {
  try {
    // Request camera permissions
    const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "Please allow camera access to capture before/after images of your work."
      );
      return null;
    }

    const result = await ExpoImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8, // Slightly reduced quality for faster upload
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const asset = result.assets[0];
    const timestamp = Date.now();
    const filename = `job_image_${timestamp}.jpg`;

    return {
      uri: asset.uri,
      type: "image/jpeg",
      filename: filename,
    };
  } catch (error) {
    console.error("Error capturing image:", error);
    Alert.alert("Error", "Failed to capture image. Please try again.");
    return null;
  }
};

/**
 * Captures multiple images using ONLY the camera (no gallery access).
 * Allows capturing up to a specified number of images in sequence.
 *
 * @param {number} maxImages - Maximum number of images to capture (default: 5)
 * @returns {Promise<Array<{ uri: string; type: string; filename: string }>>} Array of captured images
 */
export const captureMultipleCameraImages = async (
  maxImages: number = 5
): Promise<Array<{ uri: string; type: string; filename: string }>> => {
  const images: Array<{ uri: string; type: string; filename: string }> = [];

  for (let i = 0; i < maxImages; i++) {
    const shouldContinue = await new Promise<boolean>((resolve) => {
      if (i === 0) {
        // First image, no prompt
        resolve(true);
      } else {
        Alert.alert(
          "Capture Another Image?",
          `You have captured ${i} image${
            i > 1 ? "s" : ""
          }. Would you like to capture another?`,
          [
            { text: "Done", onPress: () => resolve(false), style: "cancel" },
            { text: "Capture More", onPress: () => resolve(true) },
          ]
        );
      }
    });

    if (!shouldContinue) break;

    const image = await captureCameraOnlyImage();
    if (image) {
      images.push(image);
    } else {
      // User cancelled, stop capturing
      break;
    }
  }

  return images;
};

/**
 * Prepares image data for FormData upload to API.
 * Converts image data to the format expected by React Native's FormData.
 *
 * @param {Array<{ uri: string; type: string; filename: string }>} images - Array of image data
 * @param {string} jobId - The job ID
 * @param {string} segment - The segment type ('interior' or 'exterior')
 * @returns {FormData} FormData object ready for upload
 */
export const prepareImagesForUpload = (
  images: Array<{ uri: string; type: string; filename: string }>,
  jobId: string,
  segment: "interior" | "exterior" = "exterior"
): FormData => {
  const formData = new FormData();

  // Add job_id
  formData.append("job_id", jobId);

  // Add segment
  formData.append("segment", segment);

  // Add each image with indexed key
  images.forEach((image, index) => {
    formData.append(`image_${index}`, {
      uri: image.uri,
      type: image.type,
      name: image.filename,
    } as any);
  });

  return formData;
};

export {
  uriToFile,
  handleCameraSelection,
  handleGallerySelection,
  handleImageSelection,
};
