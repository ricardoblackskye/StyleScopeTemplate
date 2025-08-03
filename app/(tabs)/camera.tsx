
import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Initialize Gemini AI (you'll need to add your API key in secrets)
  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          We need your permission to show the camera
        </ThemedText>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <ThemedText style={styles.buttonText}>Grant Permission</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        if (photo) {
          setCapturedImage(photo.uri);
          analyzeRoom(photo.base64!);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        analyzeRoom(result.assets[0].base64!);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const analyzeRoom = async (base64Image: string) => {
    if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
      Alert.alert('Error', 'Please add your Gemini API key to environment variables');
      return;
    }

    setLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Analyze this room image and provide detailed style information including:
      1. Overall design style (modern, traditional, minimalist, etc.)
      2. Color palette and scheme
      3. Furniture style and arrangement
      4. Lighting assessment
      5. Room functionality and layout
      6. Design strengths and suggestions for improvement
      7. Estimated room type (living room, bedroom, etc.)
      
      Please be detailed and helpful in your analysis.`;

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      setAnalysis(response.text());
    } catch (error) {
      console.error('Error analyzing image:', error);
      Alert.alert('Error', 'Failed to analyze room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const resetAnalysis = () => {
    setCapturedImage(null);
    setAnalysis('');
  };

  if (capturedImage) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView style={styles.analysisContainer}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <ThemedText style={styles.loadingText}>Analyzing room...</ThemedText>
            </View>
          ) : analysis ? (
            <View style={styles.resultContainer}>
              <ThemedText type="subtitle" style={styles.analysisTitle}>
                Room Style Analysis
              </ThemedText>
              <ThemedText style={styles.analysisText}>{analysis}</ThemedText>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <ThemedText style={styles.loadingText}>Analyzing room...</ThemedText>
            </View>
          )}
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.button} onPress={resetAnalysis}>
              <ThemedText style={styles.buttonText}>Take Another Photo</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText type="title" style={styles.screenTitle}>
          Room Style Analysis
        </ThemedText>
        
        <ThemedView style={styles.cameraContainer}>
          <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
                <IconSymbol name="chevron.right" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </ThemedView>
        
        <ThemedText style={styles.instructions}>
          Point your camera at a room and tap the capture button
        </ThemedText>
        
        <ThemedView style={styles.uploadSection}>
          <ThemedText type="subtitle" style={styles.uploadTitle}>
            Or Upload from Gallery
          </ThemedText>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <IconSymbol name="photo" size={24} color="white" />
            <ThemedText style={styles.uploadButtonText}>Select Photo</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  screenTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  cameraContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  camera: {
    height: 300,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 15,
    minWidth: 50,
    alignItems: 'center',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
  },
  instructions: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 30,
    opacity: 0.8,
  },
  uploadSection: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  uploadTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    margin: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  analysisContainer: {
    flex: 1,
    padding: 20,
  },
  capturedImage: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  resultContainer: {
    marginBottom: 20,
  },
  analysisTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
  },
  actionButtons: {
    marginTop: 20,
    marginBottom: 40,
  },
});
