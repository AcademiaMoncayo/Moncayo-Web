Academia Moncayo

Academia Moncayo es una plataforma integral para la enseñanza y el aprendizaje musical que combina una aplicación móvil nativa con inteligencia artificial para retroalimentación en tiempo real y un panel web administrativo para la gestión académica.

👥 Integrantes del Equipo

Nombre

Rol Principal

Responsabilidades Clave

César Jauregui

Project Manager / Developer

Gestión del proyecto, visión del producto y lógica de negocio.

Carlos Andres Zuñiga Ojeda

Lead Developer (Móvil) / Security

Desarrollo Android, Integración de IA (TFLite), Seguridad y Arquitectura.

Vania Lima

UI/UX Designer / Database Admin

Diseño de interfaces, maquetado, modelado de Base de Datos y Relaciones.

🛠️ Stack Tecnológico

El proyecto utiliza una arquitectura híbrida y segura:

📱 Móvil (Android)

Lenguaje:

IDE: Android Studio Ladybug.

IA: TensorFlow Lite (On-Device Pitch Detection).

Arquitectura: MVVM (Model-View-ViewModel).

💻 Web (Panel Admin)

Frontend:

Backend: Node.js + AWS Lambda (Serverless).

Hosting: AWS S3 + CloudFront.

☁️ Servicios en la Nube (BaaS)

Base de Datos: Firebase Cloud Firestore (NoSQL).

Autenticación: Firebase Authentication.

Almacenamiento: Firebase Storage.

🚀 Instalación y Configuración

Sigue estos pasos para levantar el entorno de desarrollo local.

Prerrequisitos

Android Studio (Última versión estable).

Node.js v20+ y npm.

Cuenta de Firebase con acceso al proyecto academia-moncayo.

Clonar el Repositorio
git clone https://github.com/tu-usuario/academia-moncayo.git cd academia-moncayo

Configuración de Variables de Entorno (IMPORTANTE 🔐)
NOTA DE SEGURIDAD: Nunca subas archivos con claves secretas al repositorio.

Para Android:

Crea un archivo local.properties en la raíz del proyecto Android si no existe.

Agrega tus claves (solicítalas al administrador del proyecto):

MAPS_API_KEY="AIzaSyA..." FIREBASE_TOKEN="eyJhb..."

Para Web:

Crea un archivo .env en la carpeta web-admin.

REACT_APP_API_URL="https://..." REACT_APP_FIREBASE_API_KEY="AIzaSy..."

🛡️ Flujo de Trabajo (GitFlow)

Para mantener la integridad del código, utilizamos una variante estricta de GitFlow:

main: Código de producción (Estable). Nunca hacer commit directo aquí.

develop: Rama principal de desarrollo e integración.

feature/nombre-funcionalidad: Ramas temporales para nuevas características.

Proceso para contribuir:

Crear rama desde develop: git checkout -b feature/mi-nueva-funcion

Hacer cambios y commits.

Subir rama: git push origin feature/mi-nueva-funcion

Crear un Pull Request (PR) hacia develop.

Code Review: Al menos un miembro del equipo debe aprobar el PR.

🧠 Módulo de Inteligencia Artificial

La aplicación utiliza un modelo .tflite para el reconocimiento de notas.

Ubicación del modelo: app/src/main/assets/pitch_model.tflite

Privacidad: El procesamiento de audio ocurre 100% en el dispositivo (Edge Computing). No se envían grabaciones a la nube.

📂 Estructura del Proyecto

academia-moncayo/ ├── android-app/ # Código fuente de la App Android (Kotlin) │ ├── app/src/main/ │ │ ├── java/ # Lógica MVVM, TFLite, Auth │ │ ├── res/ # Layouts XML, Drawables, Values │ │ └── assets/ # Modelos de IA ├── web-admin/ # Código fuente del Panel Web (React) ├── docs/ # Documentación técnica y reportes └── README.md # Este archivo

📞 Contacto y Soporte

Para dudas sobre la arquitectura o acceso a las credenciales de desarrollo, contactar a:

Líder Técnico: Carlos Andres Zuñiga Ojeda
