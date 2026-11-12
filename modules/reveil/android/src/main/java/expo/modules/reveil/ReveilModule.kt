package expo.modules.reveil

import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val PICK_RINGTONE = 7302

/** Pont entre l'écran Réveil (JavaScript) et Android. */
class ReveilModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var pickPromise: Promise? = null
  private var preview: MediaPlayer? = null
  private val main = Handler(Looper.getMainLooper())
  private val stopPreviewLater = Runnable { stopPreviewNow() }

  override fun definition() = ModuleDefinition {
    Name("Reveil")

    /** Remplace tous les réveils programmés (JSON : liste de réveils ACTIFS). */
    AsyncFunction("setAlarms") { json: String ->
      Scheduler.applyAll(context, WakeSpec.listFromJson(json))
      true
    }

    /** Ids des réveils « une fois » qui ont sonné depuis la dernière fois (vidé à la lecture). */
    AsyncFunction("consumeFired") { promise: Promise ->
      promise.resolve(AlarmStore.consumeFired(context))
    }

    AsyncFunction("status") { promise: Promise ->
      val c = context
      val b = Bundle()
      b.putBoolean("exact", Scheduler.canExact(c))
      b.putBoolean("notifications", NotificationManagerCompat.from(c).areNotificationsEnabled())
      val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      b.putBoolean("fullScreen", Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent())
      b.putBoolean("ringing", RingService.ringing != null)
      promise.resolve(b)
    }

    AsyncFunction("stopRinging") { promise: Promise ->
      if (RingService.ringing != null) context.startService(RingService.stopIntent(context))
      promise.resolve(true)
    }

    /** Ouvre la page des réglages Android qui débloque : « exact », « fullScreen » ou « notifications ». */
    AsyncFunction("openSettings") { kind: String, promise: Promise ->
      val c = context
      val pkg = Uri.parse("package:" + c.packageName)
      val intent = when {
        kind == "exact" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg)
        kind == "fullScreen" && Build.VERSION.SDK_INT >= 34 ->
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg)
        kind == "notifications" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ->
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, c.packageName)
        else -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        c.startActivity(intent)
      } catch (e: Exception) {
        c.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      promise.resolve(true)
    }

    /** Sélecteur de sonneries d'Android. Résout { uri, title } ou null si on annule. */
    AsyncFunction("pickRingtone") { current: String?, promise: Promise ->
      pickPromise?.resolve(null)
      pickPromise = promise
      val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM or RingtoneManager.TYPE_RINGTONE or RingtoneManager.TYPE_NOTIFICATION)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Sonnerie du réveil")
        .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_DEFAULT_URI, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
      if (!current.isNullOrBlank()) intent.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(current))
      try {
        appContext.throwingActivity.startActivityForResult(intent, PICK_RINGTONE)
      } catch (e: Exception) {
        pickPromise = null
        promise.resolve(null)
      }
    }

    /** Fait écouter un son quelques secondes, sur le volume alarme (comme au réveil). */
    AsyncFunction("preview") { sound: String, promise: Promise ->
      stopPreviewNow()
      val c = context
      val u = Sounds.uri(c, sound)
      if (u == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      val p = MediaPlayer()
      try {
        p.setAudioAttributes(
          AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build(),
        )
        p.setDataSource(c, u)
        p.isLooping = true
        p.prepare()
        p.start()
        preview = p
        main.postDelayed(stopPreviewLater, 5000)
        promise.resolve(true)
      } catch (e: Exception) {
        try { p.release() } catch (e2: Exception) {}
        promise.resolve(false)
      }
    }

    AsyncFunction("stopPreview") { promise: Promise ->
      stopPreviewNow()
      promise.resolve(true)
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != PICK_RINGTONE) return@OnActivityResult
      val promise = pickPromise ?: return@OnActivityResult
      pickPromise = null
      if (payload.resultCode != Activity.RESULT_OK || payload.data == null) {
        promise.resolve(null)
        return@OnActivityResult
      }
      @Suppress("DEPRECATION")
      val uri = payload.data?.getParcelableExtra<Uri>(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
      if (uri == null) {
        promise.resolve(null)
        return@OnActivityResult
      }
      val title = try {
        RingtoneManager.getRingtone(context, uri)?.getTitle(context) ?: "Sonnerie du téléphone"
      } catch (e: Exception) {
        "Sonnerie du téléphone"
      }
      val b = Bundle()
      b.putString("uri", uri.toString())
      b.putString("title", title)
      promise.resolve(b)
    }

    OnDestroy {
      stopPreviewNow()
    }
  }

  private fun stopPreviewNow() {
    main.removeCallbacks(stopPreviewLater)
    try { preview?.stop() } catch (e: Exception) {}
    try { preview?.release() } catch (e: Exception) {}
    preview = null
  }
}
