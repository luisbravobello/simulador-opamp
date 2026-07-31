# ⚡ OpAmp Lab — Simulador Interactivo de Circuitos Activos con Op-Amps

![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-22c55e?style=for-the-badge&logo=githubpages&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**OpAmp Lab** es un simulador web interactivo para la caracterización, análisis de señal y respuesta en frecuencia de circuitos analógicos basados en **Amplificadores Operacionales (Op-Amps)**.

> 🌐 **Simulador en vivo:** [https://luisbravobello.github.io/simulador-opamp/](https://luisbravobello.github.io/simulador-opamp/)

---

## 📌 Módulos de Simulación

El simulador cubre todos los experimentos requeridos en las actividades prácticas de laboratorio de electrónica analógica:

### 1.  Paso 1: Circuito Integrador con Op-Amp
- **Señal de entrada:** Onda cuadrada $V_{in}$.
- **Señal de salida:** Onda triangular integrada $V_{out}$.
- **Características:**
  - Animación en tiempo real del flujo de corriente en el circuito.
  - Ajuste dinámico de parámetros ($R$, $C$, frecuencia $f$, amplitud $V_{in}$).
  - Cálculo automático de la constante de tiempo $\tau = RC$, ganancia $|H|$ y voltaje teórico.
  - Controles de pausa/reinicio de osciloscopio.

### 2. 📈 Paso 2: Circuito Diferenciador con Op-Amp y Análisis de Ruido
- **Señal de entrada:** Onda triangular $V_{in}$.
- **Señal de salida:** Onda cuadrada diferenciada $V_{out}$.
- **Características:**
  - Slider interactivo de **Nivel de Ruido (0% - 100%)**.
  - Superposición visual del efecto del ruido de alta frecuencia en la salida ($V_{out} + \text{ruido}$).
  - Explicación didáctica sobre la ganancia proporcional a la frecuencia ($H \propto \omega$) y la necesidad de resistencia en serie.

### 3. 📊 Paso 3: Filtro Pasa-Bajas 1.er Orden (Activo Op-Amp vs. Pasivo RC)
- **Comparativa directa:** Respuesta en frecuencia entre filtro RC pasivo y filtro activo con Op-Amp.
- **Características:**
  - Diagrama de Bode doble: **Magnitud (dB)** y **Fase (°)** en escala logarítmica (1 Hz - 100 kHz).
  - Sonda de frecuencia deslizable para medir la respuesta empírica en cualquier punto.
  - Demostración de la frecuencia de corte compartida $f_c = \frac{1}{2\pi RC}$ y pendiente de $-20\text{ dB/década}$.

### 4. 🎛️ Paso 4: Filtro de 2.º Orden Topología Sallen-Key
- **Topologías disponibles:** Conmutador interactivo para filtro **Pasa-Bajas** y **Pasa-Altas**.
- **Características:**
  - Caída de pendiente de **$-40\text{ dB/década}$**.
  - Determinación experimental del punto a **$-3\text{ dB}$** de frecuencia de corte.
  - Control de factor de calidad $Q$ (Butterworth = 0.707, etc.), $R_1, R_2, C_1, C_2$.
  - Diagrama esquemático Sallen-Key animado con badges de componentes.

---

## 🎨 Características de Diseño y UI
- **Interfaz Limpia & Moderna:** Paleta en fondo blanco con contraste en negro sólido.
- **Flujo de Corriente Animado:** Partículas animadas en los diagramas de circuitos.
- **Pantalla de Carga Interactiva:** Secuencia de inicialización con barra de progreso y estado por etapas.
- **Tipografía Premium:** *Plus Jakarta Sans* para interfaz y *JetBrains Mono* para valores y fórmulas.

---

## 🛠️ Tecnologías Utilizadas

- **HTML5:** Estructura semántica.
- **CSS3 Vanilla:** Variables CSS, animaciones personalizadas, layout responsivo.
- **JavaScript (ES6+):** Motor de física de ondas y renderizado en Canvas HTML5.
- **Google Fonts:** Plus Jakarta Sans & JetBrains Mono.

---

## 🚀 Ejecución en Local

Si deseas ejecutar el proyecto localmente en tu equipo:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/luisbravobello/simulador-opamp.git
   ```
2. Entra en el directorio del proyecto:
   ```bash
   cd simulador-opamp
   ```
3. Abre `index.html` directamente en tu navegador preferido o usa una extensión de servidor local como Live Server.

---

## 👨‍💻 Autor

Desarrollado para las actividades experimentales y simulaciones de electrónica analógica.
