package expo.modules.reveil

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat

/**
 * Fait sonner un réveil : son en boucle sur le volume ALARME (sonne aussi en mode silencieux / vibreur),
 * vibration, écran plein écran par-dessus l'écran verrouillé. S'arrête seulement avec « J'arrête »
 * (pas de snooze : décision de Valentin).
 */
class RingService : Service() {
  data class Ringing(val id: String, val title: String, val since: Long)

  companion object {
    private const val CHANNEL_ID = "reveil-sonnerie"
    private const val NOTIF_ID = 7301

    @Volatile var ringing: Ringing? = null
      private set

    /** Prévenu quand la sonnerie démarre ou s'arrête (écran plein écran). */
    @Volatile var onChange: (() -> Unit)? = null

    fun stopIntent(c: Context): Intent = Intent(c, RingService::class.java).setAction(ACTION_STOP)
  }

  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null || intent.action == ACTION_STOP) {
      stopRinging()
      return START_NOT_STICKY
    }
    val id = intent.getStringExtra(EXTRA_ID) ?: "reveil"
    val title = intent.getStringExtra(EXTRA_TITLE) ?: "Réveil"
    val sound = intent.getStringExtra(EXTRA_SOUND) ?: DEFAULT_SOUND

    ringing = Ringing(id, title, System.currentTimeMillis())
    goForeground(title)
    acquireWakeLock()
    startSound(sound)
    startVibration()
    onChange?.invoke()
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    release()
    super.onDestroy()
  }

  private fun stopRinging() {
    release()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE)
      else @Suppress("DEPRECATION") stopForeground(true)
    } catch (e: Exception) {
      // déjà arrêté
    }
    stopSelf()
  }

  private fun release() {
    try { player?.stop() } catch (e: Exception) {}
    try { player?.release() } catch (e: Exception) {}
    player = null
    try { vibrator?.cancel() } catch (e: Exception) {}
    vibrator = null
    try { if (wakeLock?.isHeld == true) wakeLock?.release() } catch (e: Exception) {}
    wakeLock = null
    if (ringing != null) {
      ringing = null
      onChange?.invoke()
    }
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val ch = NotificationChannel(CHANNEL_ID, "Réveils", NotificationManager.IMPORTANCE_HIGH)
    ch.description = "Le réveil qui sonne (le son est joué par l'appli, sur le volume alarme)."
    ch.setSound(null, null)
    ch.enableVibration(false)
    ch.setBypassDnd(true)
    ch.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    nm.createNotificationChannel(ch)
  }

  private fun goForeground(title: String) {
    ensureChannel()
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val screen = Intent(this, AlarmActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
    val screenPi = PendingIntent.getActivity(this, 1, screen, flags)
    val stopPi = PendingIntent.getService(this, 2, stopIntent(this), flags)
    val notif = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(title)
      .setContentText("Réveil : touche « J'arrête » pour l'éteindre.")
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(screenPi)
      .setFullScreenIntent(screenPi, true)
      .addAction(android.R.drawable.ic_lock_idle_alarm, "J'arrête", stopPi)
      .build()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
      } else {
        startForeground(NOTIF_ID, notif)
      }
    } catch (e: Exception) {
      // Si Android refuse le premier plan, on sonne quand même (le service risque juste d'être coupé plus tôt).
    }
  }

  private fun acquireWakeLock() {
    if (wakeLock?.isHeld == true) return
    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "CerveauExterne:Reveil").apply {
      setReferenceCounted(false)
      acquire(60 * 60 * 1000L) // filet de sécurité : relâché au bout d'une heure au plus tard
    }
  }

  private fun startSound(sound: String) {
    try { player?.stop() } catch (e: Exception) {}
    try { player?.release() } catch (e: Exception) {}
    player = null

    // Volume alarme à zéro = réveil muet : on le remonte à la moitié (sinon on ne peut pas l'entendre).
    try {
      val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
      if (am.getStreamVolume(AudioManager.STREAM_ALARM) == 0) am.setStreamVolume(AudioManager.STREAM_ALARM, (max + 1) / 2, 0)
    } catch (e: Exception) {}

    val attrs = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    val candidates = listOfNotNull(
      Sounds.uri(this, sound),
      Sounds.uri(this, DEFAULT_SOUND),
      RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
    )
    for (u in candidates) {
      val p = MediaPlayer()
      try {
        p.setAudioAttributes(attrs)
        p.setDataSource(this, u)
        p.isLooping = true
        p.prepare()
        p.start()
        player = p
        return
      } catch (e: Exception) {
        try { p.release() } catch (e2: Exception) {}
      }
    }
  }

  private fun startVibration() {
    val v: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
    if (v == null || !v.hasVibrator()) return
    vibrator = v
    val pattern = longArrayOf(0, 800, 600)
    try {
      when {
        Build.VERSION.SDK_INT >= 33 ->
          v.vibrate(VibrationEffect.createWaveform(pattern, 0), VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM))
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O -> {
          val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
          @Suppress("DEPRECATION")
          v.vibrate(VibrationEffect.createWaveform(pattern, 0), attrs)
        }
        else -> @Suppress("DEPRECATION") v.vibrate(pattern, 0)
      }
    } catch (e: Exception) {}
  }
}
