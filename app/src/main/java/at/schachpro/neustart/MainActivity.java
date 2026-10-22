package at.schachpro.neustart;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.view.View;
public class MainActivity extends Activity {
 private WebView web;
 @Override public void onCreate(Bundle b) { super.onCreate(b); web=new WebView(this); web.setWebViewClient(new WebViewClient()); web.setWebChromeClient(new WebChromeClient()); WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowFileAccess(true); web.setOverScrollMode(View.OVER_SCROLL_NEVER); setContentView(web); web.loadUrl("file:///android_asset/www/index.html"); }
 @Override public void onBackPressed() { if(web!=null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
