// Helper para cargar HTML de modales
export async function loadModalHTML(modalPath) {
  try {
    const response = await fetch(modalPath);
    if (!response.ok) {
      throw new Error(`Error loading modal: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading modal HTML:', error);
    return null;
  }
}
