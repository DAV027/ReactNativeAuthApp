import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Platform,
  TouchableOpacity, Linking, Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { Button, Checkbox } from 'react-native-paper';

const API_BASE_URL = Constants.expoConfig.extra.API_BASE_URL;

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasViewedTerms, setHasViewedTerms] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !dob || !gender || !password || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!agreed) {
      Alert.alert('Error', 'You must accept the Terms and Conditions');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, dob, gender, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Registered successfully', [
          { text: 'Go to Login', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not register');
    }
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      setDob(formatted);
    }
  };

  const openTerms = () => {
  navigation.navigate('Terms');
  setHasViewedTerms(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>

      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />

      {/* DOB */}
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInput}>
        <Text>{dob || 'Select Date of Birth'}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}

      {/* Gender */}
      <View style={styles.picker}>
        <Picker selectedValue={gender} onValueChange={(val) => setGender(val)}>
          <Picker.Item label="Select Gender" value="" />
          <Picker.Item label="Male" value="Male" />
          <Picker.Item label="Female" value="Female" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>

      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      {/* Terms Agreement with clickable link */}
      <View style={styles.termsRow}>
        <Checkbox
          status={agreed ? 'checked' : 'unchecked'}
          disabled={!hasViewedTerms}
          onPress={() => setAgreed(!agreed)}
        />
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text style={styles.linkText} onPress={openTerms}>
            Terms and Conditions
          </Text>
        </Text>
      </View>

      <Button mode="contained" onPress={handleRegister} disabled={!agreed} style={{ marginTop: 10 }}>
        Register
      </Button>

      <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
        Already have an account? Login
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f4f6f8',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    height: 50,
    justifyContent: 'center',
  },
  dateInput: {
    height: 50,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 14,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  linkText: {
    color: '#007bff',
    textDecorationLine: 'underline',
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    color: '#4A90E2',
    fontSize: 14,
  },
});
