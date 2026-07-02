import React from 'react';
import { WebView } from 'react-native-webview';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <WebView
        source={{ uri: 'https://yuanjian.org' }}
        style={styles.webview}
        allowsBackForwardNavigationGestures={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
});
