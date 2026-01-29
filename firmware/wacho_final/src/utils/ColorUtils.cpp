#include "ColorUtils.h"

lv_color_t ColorUtils::getStatusColor(const String& status) {
    if (status == "Sin Iniciar") {
        return lv_palette_main(LV_PALETTE_GREY);
    } else if (status == "En Progreso") {
        return lv_palette_main(LV_PALETTE_YELLOW);
    } else if (status == "Completada") {
        return lv_palette_main(LV_PALETTE_GREEN);
    } else if (status == "No Completada") {
        return lv_palette_main(LV_PALETTE_RED);
    } else if (status == "Sin Pendientes") {
        return lv_color_make(255, 255, 255);
    } else if (status == "Extra") {
        return lv_palette_main(LV_PALETTE_BLUE);
    }
    
    return lv_palette_main(LV_PALETTE_INDIGO); // Fallback
}
