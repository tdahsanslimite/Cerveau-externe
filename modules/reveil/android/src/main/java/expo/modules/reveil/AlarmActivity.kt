package expo.modules.reveil

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Écran du réveil qui sonne, affiché même téléphone verrouillé.
 * Un seul bouton, « J'arrête ». Le retour du téléphone ne ferme pas l'écran : il faut arrêter le réveil.
 */
class AlarmActivity : Activity() {
  private lateinit var titleView: TextView
  private lateinit var timeView: TextView
  private val listener: () -> Unit = { runOnUiThread { refresh() } }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    window.statusBarColor = Color.parseColor("#0C4450")

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#0C4450"))
      setPadding(dp(28), dp(48), dp(28), dp(48))
    }
    val label = text("RÉVEIL", 16f, "#C8A25A", bold = true).apply { letterSpacing = 0.15f }
    timeView = text("", 84f, "#FFFFFF", bold = true)
    titleView = text("", 28f, "#FFFFFF", bold = false).apply { setPadding(0, dp(8), 0, dp(56)) }
    val stop = text("J'arrête", 26f, "#16252B", bold = true).apply {
      background = GradientDrawable().apply {
        cornerRadius = dp(22).toFloat()
        setColor(Color.parseColor("#C8A25A"))
      }
      setPadding(dp(24), dp(26), dp(24), dp(26))
      isClickable = true
      isFocusable = true
      contentDescription = "J'arrête le réveil"
      setOnClickListener {
        startService(RingService.stopIntent(this@AlarmActivity))
        finish()
      }
    }
    root.addView(label)
    root.addView(timeView)
    root.addView(titleView)
    root.addView(stop, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    setContentView(root)
  }

  override fun onResume() {
    super.onResume()
    RingService.onChange = listener
    refresh()
  }

  override fun onDestroy() {
    if (RingService.onChange === listener) RingService.onChange = null
    super.onDestroy()
  }

  @Deprecated("Le retour ne doit pas faire disparaître un réveil qui sonne.")
  override fun onBackPressed() {
    // volontairement vide : on ne peut pas « nier » le réveil
  }

  private fun refresh() {
    val r = RingService.ringing
    if (r == null) {
      finish()
      return
    }
    titleView.text = r.title
    timeView.text = SimpleDateFormat("HH:mm", Locale.FRANCE).format(Date(r.since))
  }

  private fun dp(v: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

  private fun text(value: String, size: Float, color: String, bold: Boolean): TextView = TextView(this).apply {
    text = value
    setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
    setTextColor(Color.parseColor(color))
    gravity = Gravity.CENTER
    typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
  }
}
