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
