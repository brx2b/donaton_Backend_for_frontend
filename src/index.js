const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
require('dotenv').config();

const app=express();
const PORT=process.env.PORT || 4000;
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'], // ambos puertos por si acaso
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
GATEWAY_URL="http://host.docker.internal:8086";

app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for dev
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Gateway URL: ${GATEWAY_URL}`);
});

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

        res.status(statusCode).json({
            error: "No se pudo completar el registro",
            detalles: mensajeError
        });
    }

});
app.post('/api/usuarios/login', async (req, res) => {
    try{
        const datosFormularioLogin=req.body;
        console.log("Enviando datos")
        const response= await axios.post(`${GATEWAY_URL}/usuarios/login`,{
            nombre:datosFormularioLogin.nombre,
            password:datosFormularioLogin.password
        });
        res.status(response.status).json({
            message:"login exitoso",
            data:response.data,
            
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
app.post('/api/donaciones/donar', async (req, res) => {
    try {
        const datosDonacion = req.body;
        const response = await axios.post(`${GATEWAY_URL}/donaciones/donar`, datosDonacion);
        res.status(response.status).json({
            message: "Donación registrada exitosamente",
            data: response.data
        });
    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";
        res.status(statusCode).json({
            error: "No se pudo registrar la donación",
            detalles: mensajeError
        });
        console.error('Error al registrar donación:', error.message);
    }
});

// --- OBTENER UN USUARIO POR ID ---
app.get('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(`${GATEWAY_URL}/usuarios/${id}`);
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
app.get('/api/usuarios', async (req, res) => {
    try {
        const response = await axios.get(`${GATEWAY_URL}/usuarios`);
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
app.get('/api/donaciones', async (req, res) => {
    try {
        const response = await axios.get(`${GATEWAY_URL}/donaciones`);
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
app.delete('/api/donaciones/:id', async (req, res) => {
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
app.get('/api/logistica', async (req, res) => {
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

// --- REGISTRAR ENVÍO DE LOGÍSTICA ---
app.post('/api/logistica', async (req, res) => {
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

        console.log("✅ Respuesta del Gateway:", response.status);

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
app.delete('/api/logistica/:matricula', async (req, res) => {
    try {
        const { matricula } = req.params;
        console.log(`Eliminando envío con matricula: ${matricula}`);

        const response = await axios.delete(`${GATEWAY_URL}/logistica/${matricula}`);

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
app.delete('/api/necesidades/:id', async (req, res) => {
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
