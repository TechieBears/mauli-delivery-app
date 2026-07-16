import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { CloseCircle } from 'iconsax-react-native';
import { colors } from '../theme/colors';
import { toHttpsUrl, isPdfUrl } from '../utils/imageUrl';

// Full-screen viewer for an agreement/KYC document that may be either a PDF or
// an image. Both are rendered inside a WebView so we get native scroll and
// pinch-zoom for free, and a single component handles both file types.
//
//  - PDF: iOS (WKWebView) renders PDFs inline from the URL. Android's WebView
//    can't render a remote PDF directly, so we route it through Google's online
//    viewer, which returns a scrollable/zoomable HTML page.
//  - Image: wrapped in a minimal HTML page that centres it and enables pinch
//    zoom, so large scanned documents can be inspected clearly.
const buildImageHtml = uri => `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=6, user-scalable=yes" />
    <style>
      html, body { margin: 0; padding: 0; background: #111; height: 100%; }
      .wrap { display: flex; align-items: center; justify-content: center; min-height: 100%; }
      img { max-width: 100%; height: auto; display: block; }
    </style>
  </head>
  <body>
    <div class="wrap"><img src="${uri}" /></div>
  </body>
</html>`;

const Loading = () => (
  <View style={styles.loading}>
    <ActivityIndicator color={colors.primary} size="large" />
  </View>
);

const DocumentViewer = ({ visible, uri, title = 'Document', onClose }) => {
  const insets = useSafeAreaInsets();
  // Inside a translucent-status-bar Modal, Android often reports insets.top === 0,
  // which lets the header slide under the clock/battery. Fall back to the real
  // status-bar height there so the header always clears the system UI.
  const topInset =
    insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0);
  const httpsUri = toHttpsUrl(uri);
  const isPdf = isPdfUrl(uri);

  // Decide what the WebView loads.
  let source;
  if (!httpsUri) {
    source = null;
  } else if (isPdf) {
    source =
      Platform.OS === 'android'
        ? { uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(httpsUri)}` }
        : { uri: httpsUri };
  } else {
    source = { html: buildImageHtml(httpsUri) };
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <View style={styles.screen}>
        {/* Header sits below the status bar/notch via the top safe-area inset. */}
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7}>
            <CloseCircle size={28} color="#fff" variant="Bold" />
          </TouchableOpacity>
        </View>

        {source ? (
          <WebView
            source={source}
            style={styles.webview}
            contentContainerStyle={{ paddingBottom: insets.bottom }}
            originWhitelist={['*']}
            startInLoadingState
            renderLoading={Loading}
            scalesPageToFit
            // Allow the pinch-zoom meta viewport above to take effect on iOS.
            automaticallyAdjustContentInsets={false}
          />
        ) : (
          <View style={styles.loading}>
            <Text style={styles.emptyText}>No document to display.</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#111',
  },
  headerTitle: {
    flex: 1,
    marginRight: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  webview: { flex: 1, backgroundColor: '#111' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  emptyText: {
    fontSize: 14,
    color: '#bbb',
  },
});

export default DocumentViewer;
