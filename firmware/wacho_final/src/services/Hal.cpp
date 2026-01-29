#include "Hal.h"
#include "../ui/components/AppBar.h"

Hal::VibrationState Hal::vibState = {false, 0, 0};

void Hal::init() {
    watch.begin();
    beginLvglHelper();
    watch.setBrightness(200); // Default brightness
    
    // Initialize DRV2605
    // LilyGoLib initializes it automatically, but we can ensure mode here if needed
}

void Hal::update() {
    lv_task_handler();
    
    // Update Clock
    static uint32_t lastTimeUpdate = 0;
    if (millis() - lastTimeUpdate > 1000) {
        lastTimeUpdate = millis();
        struct tm timeinfo;
        watch.getDateTime(&timeinfo);
        AppBar::updateTime(&timeinfo);
        
        // Update Battery
        static uint32_t lastBatUpdate = 0;
        if (millis() - lastBatUpdate > 5000) {
            lastBatUpdate = millis();
            int bat = watch.getBatteryPercent();
            AppBar::updateBattery(bat);
        }
    }
    
    // Handle manual vibration timing
    if (vibState.active) {
        if (millis() - vibState.startTime >= vibState.duration) {
            watch.setMode(5); // Real-time mode
            watch.setRealtimeValue(0); // Stop
            vibState.active = false;
        }
    }
}

void Hal::setBrightness(uint8_t level) {
    watch.setBrightness(level);
}

// --- Library Mode (Pre-defined effects) ---
void Hal::vibrate() {
    // Effect 14: Strong Buzz 100%
    watch.setWaveform(0, 14); 
    watch.setWaveform(1, 0);  
    watch.run();
}

void Hal::vibrateSuccess() {
    watch.setWaveform(0, 14);
    watch.setWaveform(1, 0);
    watch.run();
    delay(100); // Blocking delay for sequence is acceptable for short feedback
    watch.setWaveform(0, 14);
    watch.setWaveform(1, 0);
    watch.run();
}

void Hal::vibrateError() {
    watch.setWaveform(0, 14);
    watch.setWaveform(1, 0);
    watch.run();
    delay(200);
    watch.setWaveform(0, 14);
    watch.setWaveform(1, 0);
    watch.run();
    delay(200);
    watch.setWaveform(0, 14);
    watch.setWaveform(1, 0);
    watch.run();
}

// --- Manual Mode (Real-time control) ---
void Hal::vibrateManual(uint32_t durationMs, uint8_t intensity) {
    vibState.active = true;
    vibState.startTime = millis();
    vibState.duration = durationMs;
    
    watch.setMode(5); // Real-time playback mode
    watch.setRealtimeValue(intensity);
}

void Hal::vibratePattern(uint8_t intensity, int count) {
    watch.setMode(5); // Real-time playback mode
    for (int i = 0; i < count; i++) {
        watch.setRealtimeValue(intensity);
        delay(500);
        watch.setRealtimeValue(0);
        if (i < count - 1) delay(300);
    }
    // Ensure off
    watch.setRealtimeValue(0);
}
