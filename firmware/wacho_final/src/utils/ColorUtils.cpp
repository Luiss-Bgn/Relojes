#include "ColorUtils.h"

lv_color_t ColorUtils::getStatusColor(const String& status) {
    if (status == "sin_iniciar") {
        return lv_palette_main(LV_PALETTE_GREY);
    } else if (status == "en_progreso") {
        return lv_palette_main(LV_PALETTE_YELLOW);
    } else if (status == "completada") {
        return lv_palette_main(LV_PALETTE_GREEN);
    } else if (status == "vencida") {
        return lv_palette_main(LV_PALETTE_RED);
    } else if (status == "extra") {
        return lv_palette_main(LV_PALETTE_BLUE);
    }
    
    return lv_palette_main(LV_PALETTE_INDIGO); // Fallback
}
