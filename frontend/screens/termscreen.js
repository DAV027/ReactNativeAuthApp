import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function TermsScreen() {
  return (
    <View style={styles.container}>
      <WebView
        source={{
          uri: 'https://docs.google.com/viewerng/viewer?url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        }}
        style={{ flex: 1 }}
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
