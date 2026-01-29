#include "PowerManager.h"

bool PowerManager::isDimmed = false;
bool PowerManager::isSleeping = false;

void PowerManager::init() {
    // Initial state
    isDimmed = false;
    isSleeping = false;
    setCpuFrequencyMhz(CPU_HIGH);
}

void PowerManager::update() {
    uint32_t inactiveTime = lv_disp_get_inactive_time(NULL);

    if (inactiveTime < DIM_TIME_MS) {
        // Active
        if (isSleeping || isDimmed) {
            wakeUp();
        }
    } else if (inactiveTime >= SLEEP_TIME_MS) {
        // Sleep
        if (!isSleeping) {
            Serial.println("[Power] Entering Sleep Mode (Screen OFF, CPU 80MHz)");
            isSleeping = true;
            Hal::setBrightness(0);
            setCpuFrequencyMhz(CPU_LOW);
        }
    } else if (inactiveTime >= DIM_TIME_MS) {
        // Dim
        if (!isDimmed && !isSleeping) {
            Serial.println("[Power] Dimming Screen");
            isDimmed = true;
            Hal::setBrightness(DIM_BRIGHTNESS);
        }
    }
}

void PowerManager::wakeUp() {
    if (isSleeping || isDimmed) {
        Serial.println("[Power] Waking Up");
        isSleeping = false;
        isDimmed = false;
        setCpuFrequencyMhz(CPU_HIGH);
        Hal::setBrightness(MAX_BRIGHTNESS);
    }
}
