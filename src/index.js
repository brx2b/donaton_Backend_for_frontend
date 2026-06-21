const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors({
    origin: ["http://13.222.223.222",'http://10.0.140.143','http://10.0.158.181','http://localhost:5173', 'http://localhost:5174','http://52.87.217.73:5173','http://52.87.217.73','http://52.87.217.73:4000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
const GATEWAY_URL = process.env.GATEWAY_URL || "http://10.0.158.181:8081";

app.use(helmet({
  contentSecurityPolicy: false, 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const getTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return req.cookies?.token || null;
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Gateway URL: ${GATEWAY_URL}`);
});
// Middleware para proteger rutas en el BFF
const verificarTokenBFF = (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({
            error: "No autorizado",
            detalles: "Debes iniciar sesión para realizar esta acción."
        });
    }

    req.tokenValido = token;

    //si todo va bien, la ejecución continua
    next();
};

// --- REGISTRO DE NUEVO USUARIO ---
app.post('/api/usuarios/nuevoUsuario', async (req, res) => {
    try {
        // Los datos vienen del formulario en req.body
        const datosFormulario = req.body;

        // El BFF puede validar o limpiar los datos antes de enviarlos
        // Por ejemplo, asegurar que el email sea minúscula
        if (datosFormulario.email) {
            datosFormulario.email=datosFormulario.email.trim();
            datosFormulario.email = datosFormulario.email.toLowerCase();
        }
        if(datosFormulario.password){
            datosFormulario.password=datosFormulario.password.trim();
            datosFormulario.password=datosFormulario.password.toLowerCase();
        }
        if(datosFormulario.nombre){
            datosFormulario.nombre=datosFormulario.nombre.trim();
            datosFormulario.nombre=datosFormulario.nombre.toLowerCase()
        }
        if(datosFormulario.nombre=="admin" || datosFormulario.nombre=="administrador"){
            return res.status(400).json({
                error: "El nombre de usuario no puede ser 'admin' o 'administrador'"
            }); //respuesta
        }
        if(datosFormulario.password=="admin" || datosFormulario.password=="administrador"){
            return res.status(400).json({
                error: "La contraseña no puede ser 'admin' o 'administrador'"
            }); //respuesta
        }
        const enviarDatos={
            nombre: datosFormulario.nombre,
            email: datosFormulario.email,
            password: datosFormulario.password,
            rol:"usuario" //rol por defecto
        }
        console.log('Enviando datos al Gateway:', enviarDatos);

        // Llamamos al Gateway de Spring Boot que centraliza los microservicios
        const response = await axios.post(`${GATEWAY_URL}/usuarios/nuevoUsuario`, enviarDatos);

        // Si Spring responde con éxito (200 o 201)
        res.status(response.status).json({
            message: "Usuario creado exitosamente",
            data: response.data 
        });

    } catch (error) {
        console.error('Error al registrar en el backend:', error.message);
        
        // Capturamos el error que envíe Spring (ej: "Email ya existe")
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";
        if(statusCode===409){
            return res.status(statusCode).json({
                error: "El email ya está registrado",
            });
        }
        res.status(statusCode).json({
            error: "No se pudo completar el registro",
            detalles: mensajeError
        });
    }

});
//LOGIN DE USUARIO
app.post('/api/usuarios/login', async (req, res) => {
    try{
        const datosFormularioLogin=req.body;
        console.log("Enviando datos")
        const response = await axios.post(`${GATEWAY_URL}/usuarios/login`,{
            nombre: datosFormularioLogin.nombre,
            password: datosFormularioLogin.password
        });

        const tokenJWT = response.data.token;
        const nombreUsuario = response.data.usuario;
        const rolUsuario = response.data.rol;
        const userId=response.data.id;
        res.cookie('token', tokenJWT, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24 // 1 día
        });

        res.status(response.status).json({
            message: "login exitoso",
            data: response.data
        });
        
    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";

        console.error('Error al manejar login en el backend:', error.message || error.toString());
        if (error.response) {
            console.error('Axios error response status:', error.response.status);
            console.error('Axios error response data:', error.response.data);
        } else if (error.request) {
            console.error('Axios no response received, request:', error.request);
        } else {
            console.error('Axios error config:', error.config);
        }

        res.status(statusCode).json({
            error: "No se pudo completar el login",
            detalles: mensajeError
        });
    }
});
// --- LOGOUT DE USUARIO ---
app.post('/api/usuarios/logout', (req, res) => {
    // Al meter res.clearCookie, el navegador elimina el token al instante
    res.clearCookie('token', {
        httpOnly: true,
        secure: false, 
        sameSite: 'strict',
        path: '/' // Importante para que limpie la cookie en toda la app
    });

    return res.status(200).json({ 
        message: "Sesión cerrada y cookies eliminadas exitosamente" 
    });
});

// --- LISTAR NECESIDADES ---
app.get('/api/necesidades', async (req, res) => {
    try {
        const response = await axios.get(`${GATEWAY_URL}/necesidades`);
        res.status(response.status).json({
            message: "Necesidades obtenidas exitosamente",
            data: response.data
        });
    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";
        res.status(statusCode).json({
            error: "No se pudieron obtener las necesidades",
            detalles: mensajeError
        });
        console.error('Error al obtener necesidades:', error.message);
    }
});

// --- REGISTRAR DONACIÓN ---
app.post('/api/donaciones/donar', verificarTokenBFF, async (req, res) => {
    try {
        console.log("Recibiendo petición en BFF DONAR");
        const datosDonacion = req.body;
        
        // 1. Capturar el token que fue validado por middleware
        const token = req.tokenValido || getTokenFromRequest(req); 

        console.log(`Token a propagar: ${token ? token.substring(0, 20) + "..." : "NINGUNO"}`);
        console.log(`Redirigiendo al Gateway: ${GATEWAY_URL}/donaciones/donar`);

        // 2. Propagar la petición a Spring Boot incluyendo el token en las cabeceras
        const response = await axios.post(`${GATEWAY_URL}/donaciones/donar`, datosDonacion, {
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            }
        });

        // 3. Responder al frontend con el éxito del microservicio
        res.status(response.status).json({
            message: "Donación registrada exitosamente",
            data: response.data
        });

    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";
        
        // Log ultra detallado en tu consola de Node para no adivinar fallos
        console.error('❌ Error al registrar donación en el Backend:', error.message);
        if (error.response) {
            console.error('Detalles devueltos por Spring:', error.response.data);
        }

        res.status(statusCode).json({
            error: "No se pudo registrar la donación",
            detalles: mensajeError
        });
    }
});

// --- OBTENER UN USUARIO POR ID ---
app.get('/api/usuarios/:id', verificarTokenBFF,async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(`${GATEWAY_URL}/usuarios/${id}`,{
            headers:{
                'Authorization':`Bearer ${getTokenFromRequest(req)}`
            }
        });
        res.status(response.status).json({
            message: "Usuario obtenido exitosamente",
            data: response.data
        });
    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";
        res.status(statusCode).json({
            error: "No se pudo obtener el usuario",
            detalles: mensajeError
        });
        console.error('Error al obtener usuario:', error.message);
    }
});

// --- OBTENER TODOS LOS USUARIOS ---
app.get('/api/usuarios', verificarTokenBFF, async (req, res) => {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                error: "No se proporcionó token de autenticación"
            });
        }

        const response = await axios.get(`${GATEWAY_URL}/usuarios`,{
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        res.status(response.status).json({
            message: "Usuarios obtenidos exitosamente",
            data: response.data
        });
    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";
        res.status(statusCode).json({
            error: "No se pudieron obtener los usuarios",
            detalles: mensajeError
        });
        console.error('Error al obtener usuarios:', error.message);
    }
});

// --- OBTENER HISTORIAL DE DONACIONES ---
app.get('/api/donaciones', verificarTokenBFF, async (req, res) => {
    try {
        console.log("Obteniendo historial!")
        const token = req.tokenValido;
        const response = await axios.get(`${GATEWAY_URL}/donaciones`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        res.status(response.status).json({
            message: "Historial de donaciones obtenido exitosamente",
            data: response.data
        });
    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";
        res.status(statusCode).json({
            error: "No se pudo obtener el historial de donaciones",
            detalles: mensajeError
        });
        console.error('Error al obtener historial de donaciones:', error.message);
    }
});


// --- ELIMINAR DONACIÓN ---
app.delete('/api/donaciones/:id',verificarTokenBFF,  async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.delete(`${GATEWAY_URL}/donaciones/${id}`);
        res.status(response.status).json({
            message: "Donación eliminada exitosamente",
            data: response.data
        });
    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";
        res.status(statusCode).json({
            error: "No se pudo eliminar la donación",
            detalles: mensajeError
        });
        console.error('Error al eliminar donación:', error.message);
    }
});

// --- OBTENER ENVÍOS DE LOGÍSTICA ---
app.get('/api/logistica',verificarTokenBFF, async (req, res) => {
    try {
        const response = await axios.get(`${GATEWAY_URL}/logistica`);
        res.status(response.status).json({
            message: "Envíos de logística obtenidos exitosamente",
            data: response.data
        });
    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";
        res.status(statusCode).json({
            error: "No se pudieron obtener los envíos de logística",
            detalles: mensajeError
        });
        console.error('Error al obtener envíos de logística:', error.message);
    }
});

// --- REGISTRAR ENVÍO DE LOGÍSTICA ---
app.post('/api/logistica',verificarTokenBFF, async (req, res) => {
    try {
        const datosEnvio = req.body;
        
        console.log("📦 Body recibido en BFF:", datosEnvio); // ← Muy importante

        // Validación básica
        if (!datosEnvio.matricula || !datosEnvio.chofer || !datosEnvio.destino || !datosEnvio.origen) {
            return res.status(400).json({
                error: "Faltan campos obligatorios (matricula, chofer, destino, origen)"
            });
        }

        console.log(`Enviando al Gateway: ${GATEWAY_URL}/logistica`);

        const response = await axios.post(`${GATEWAY_URL}/logistica/nuevaLogistica`, datosEnvio);

        console.log("Respuesta del Gateway:", response.status);

        res.status(response.status).json({
            message: "Envío de logística registrado exitosamente",
            data: response.data
        });

    } catch (error) {
        console.error('❌ Error al registrar envío de logística:', error.message);
        
        if (error.response) {
            console.error('Detalles del Gateway:', error.response.data);
        }

        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : error.message;

        res.status(statusCode).json({
            error: "No se pudo registrar el envío de logística",
            detalles: mensajeError
        });
    }
});

// --- ELIMINAR ENVÍO DE LOGÍSTICA ---
app.delete('/api/logistica/:id',verificarTokenBFF, async (req, res) => {
    try {
        console.log("Procesando solicitud")
        const { id } = req.params;

        const response = await axios.delete(`${GATEWAY_URL}/logistica/${id}`);

        res.status(response.status).json({
            message: "Envío eliminado exitosamente",
            data: response.data
        });
    } catch (error) {
        console.error(`Error al eliminar envío ${req.params.matricula}:`, error.message);
        
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";

        res.status(statusCode).json({
            error: "No se pudo eliminar el envío",
            detalles: mensajeError
        });
    }
});

// --- ELIMINAR NECESIDAD ---
app.delete('/api/necesidades/:id',verificarTokenBFF, async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.delete(`${GATEWAY_URL}/necesidades/${id}`);
        res.status(response.status).json({
            message: "Necesidad eliminada exitosamente",
            data: response.data
        });
    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";
        res.status(statusCode).json({
            error: "No se pudo eliminar la necesidad",
            detalles: mensajeError
        });
        console.error('Error al eliminar necesidad:', error.message);
    }
});

