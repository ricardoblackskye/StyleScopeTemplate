import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Modal,
  Text 
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
  const [showModal, setShowModal] = useState(false);
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
      setShowModal(true);
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
    setShowModal(false);
  };

  const formatAnalysisText = (text: string) => {
    const sections = text.split(/\*\*(\d+\.\s*[^:]+:)\*\*/).filter(Boolean);
    const formattedSections = [];

    for (let i = 0; i < sections.length; i += 2) {
      const heading = sections[i];
      const content = sections[i + 1] || '';

      if (heading && content) {
        formattedSections.push({
          heading: heading.replace(/^\d+\.\s*/, ''),
          content: content.trim()
        });
      }
    }

    return formattedSections;
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      const isSubheading = line.trim().startsWith('*');
      if (isSubheading) {
        return (
          <Text key={index} style={[styles.subheading, { color: '#FF0000' }]}>
            {line.replace(/^\*\s*/, '• ')}
          </Text>
        );
      }
      return (
        <Text key={index} style={styles.contentText}>
          {line}
        </Text>
      );
    });
  };

  if (capturedImage && !showModal) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView style={styles.analysisContainer}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <ThemedText style={styles.loadingText}>Analyzing room...</ThemedText>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                Room Style Analysis
              </ThemedText>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowModal(false)}
              >
                <IconSymbol name="xmark" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {analysis ? formatAnalysisText(analysis).map((section, index) => (
                <View key={index} style={styles.analysisSection}>
                  <ThemedText type="subtitle" style={styles.sectionHeading}>
                    {section.heading}
                  </ThemedText>
                  <View style={styles.sectionContent}>
                    {renderFormattedContent(section.content)}
                  </View>
                </View>
              )) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.button} 
                onPress={() => {
                  setShowModal(false);
                  resetAnalysis();
                }}
              >
                <ThemedText style={styles.buttonText}>Take Another Photo</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 0,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  analysisSection: {
    marginBottom: 25,
  },
  sectionHeading: {
    color: '#061e2e',
    marginBottom: 15,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionContent: {
    paddingLeft: 10,
  },
  subheading: {
    color: '#FF0000',
    fontSize: 14,
    fontWeight: 'normal',
    marginBottom: 5,
    lineHeight: 20,
  },
  contentText: {
    color: '#555',
    fontSize: 14,
    fontWeight: 'normal',
    lineHeight: 20,
    marginBottom: 5,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});