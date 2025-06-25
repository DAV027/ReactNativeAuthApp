import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, Alert,
  Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_BASE_URL = Constants.expoConfig.extra.API_BASE_URL;


export default function ProfileScreen() {
  const [user, setUser] = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('email');
      if (!email) return Alert.alert('Error', 'Email not found in storage');

      const res = await fetch(`${API_BASE_URL}/auth/profile/${email}`);
      const data = await res.json();

      if (data.message) Alert.alert('Error', data.message);
      else setUser(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const uploadImage = async (uri) => {
  try {
    const token = await AsyncStorage.getItem('token');

    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    const formData = new FormData();
    formData.append('profile_image', {
      uri,
      name: filename,
      type,
    });

    const res = await fetch(`${API_BASE_URL}/auth/upload-profile-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const data = await res.json();
    if (res.ok && data.imageUrl) {
      setUser((prev) => ({ ...prev, profile_image: data.imageUrl }));
      Alert.alert('Success', 'Image uploaded');
    } else {
      Alert.alert('Upload Failed', data.message || 'Try again');
    }
  } catch (err) {
    Alert.alert('Error', 'Could not upload image');
  }
};



const deleteImage = async () => {
  const token = await AsyncStorage.getItem('token');

  try {
    const res = await fetch(`${API_BASE_URL}/auth/profile-image`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (res.ok) {
      setUser((prev) => ({ ...prev, profile_image: null }));
      Alert.alert('Success', 'Image deleted');
    } else {
      Alert.alert('Failed', data.message);
    }
  } catch (err) {
    Alert.alert('Error', 'Failed to delete image');
  }
};


  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled && result.assets?.length > 0) {
    const uri = result.assets[0].uri;
    await uploadImage(uri);
    }
  };

  const updateProfile = async () => {
    const token = await AsyncStorage.getItem('token');
    const { name, dob, gender, profile_image } = user;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, dob, gender, profile_image }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Profile updated');
        setEditing(false);
      } else {
        Alert.alert('Update Failed', data.message || 'Try again');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not update profile');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split('T')[0];
      setUser((prev) => ({ ...prev, dob: isoDate }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={pickImage}>
        {user.profile_image ? (
          <Image source={{ uri: user.profile_image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]}>
            <Text style={{ color: '#999' }}>Tap to upload</Text>
          </View>
        )}
      </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          {user.profile_image && editing && (
            <TouchableOpacity onPress={deleteImage}>
              <Text style={{ color: 'red', marginBottom: 16 }}>Remove Profile Image</Text>
            </TouchableOpacity>
         )}
        </View>


      <TextInput
        style={styles.input}
        value={user.name || ''}
        onChangeText={(val) => setUser({ ...user, name: val })}
        editable={editing}
        placeholder="Name"
      />

      <TextInput
        style={[styles.input, { backgroundColor: '#f2f2f2' }]}
        value={user.email || ''}
        editable={false}
        placeholder="Email"
      />

      <TouchableOpacity
        style={styles.input}
        onPress={() => editing && setShowDatePicker(true)}
        disabled={!editing}
      >
        <Text style={{ fontSize: 16, color: user.dob ? '#000' : '#999' }}>
          {user.dob || 'Select DOB'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={user.dob ? new Date(user.dob) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {editing ? (
        <Picker
          selectedValue={user.gender}
          style={styles.picker}
          onValueChange={(value) => setUser({ ...user, gender: value })}
        >
          <Picker.Item label="Select Gender" value="" />
          <Picker.Item label="Male" value="Male" />
          <Picker.Item label="Female" value="Female" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      ) : (
        <TextInput
          style={styles.input}
          value={user.gender || ''}
          editable={false}
          placeholder="Gender"
        />
      )}

      {editing ? (
        <TouchableOpacity style={styles.button} onPress={updateProfile}>
          <Text style={styles.buttonText}>Save Profile</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={() => setEditing(true)}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  placeholder: {
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 8,
    fontSize: 16,
  },
  picker: {
    width: '100%',
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
});
