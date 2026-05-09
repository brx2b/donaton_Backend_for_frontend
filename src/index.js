const express=require('express');
const cors=require('cors');
const axios = require('axios'); 
require('dotenv').config();

const app=express();
const PORT=process.env.PORT || 4000;
const GATEWAY_URL=process.env.GATEWAY_URL || 'http://localhost:8086';

app.use(cors());
app.use(express.json());


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
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
        
    }catch(error){
        const statusCode = error.response ? error.response.status : 500;
        const mensajeError = error.response ? error.response.data : "Error interno del servidor";

        res.status(statusCode).json({
            error: "No se pudo completar el login",
            detalles: mensajeError
        })
        console.error('Error al manejar login en el backend:', error.message);
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

// --- OBTENER USUARIO POR ID ---
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
