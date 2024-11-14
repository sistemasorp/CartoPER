/*
 MIT License
 Copyright (c) 2024 Oscar Rodriguez Parra
 For full license details, see the LICENSE file in the project root.
*/

// Selecciona el canvas
const canvas = document.getElementById('carta');
const ctx = canvas.getContext('2d');

// Variables para controlar la imagen y el zoom
let escala = 0;               // Factor de escala
let xImagen = 0;              // Posición X de la imagen en el canvas
let yImagen = 0;              // Posición Y de la imagen en el canvas
let imagenAncho, imagenAlto;  // Dimensiones originales de la imagen
const zoomPaso = 0.1;         // Incremento del zoom por cada movimiento de rueda
const maxZoom = 3;            // Zoom máximo permitido
let minZoom = 1;              // Zoom mínimo basado en la escala inicial
let estaArrastrando = false;       // Controla si el usuario está arrastrando la imagen
let mostrandoOpciones = false;     // Controla si se está mostrando la caja de opciones
let mostrandoRuta = false;     // Controla si se está mostrando la enfilacion
let startX, startY;           // Posición inicial del ratón al comenzar a arrastrar
let mouseX = 0;				  // Posición X del ratón
let mouseY = 0;				  // Posición Y del ratón
const minutoLAT = 58.34;      // Pixeles que mide un minuto de latitud
const minutoLON = 47.40;         // Pixeles que mide un minuto de longitud
const minMapaX = 77;          // Posición X donde empieza el mapa
const minMapaY = 73;          // Posición Y donde empieza el mapa
const maxMapaX = 3385;        // Posición X donde acaba el mapa
const maxMapaY = 2400;        // Posición Y donde acaba el mapa
const grosorLinea = 5;        // Grosor de la linea de las posiciones
let figuras = [];

// Cargar la imagen
const imagen = new Image();
imagen.onload = () => {
    imagenAncho = imagen.width;
    imagenAlto = imagen.height;
    ajustarImagenInicial();
};
imagen.src = 'carta.jpg';

// Ajusta el tamaño del canvas al tamaño de la ventana
function ajustarCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Escala y centra la imagen inicialmente para que se vea completa
function ajustarImagenInicial() {
    const canvasRatio = canvas.width / canvas.height;
    const imagenRatio = imagen.width / imagen.height;

    if (imagenRatio > canvasRatio) {
        escala = canvas.width / imagen.width;
        xImagen = 0;
        yImagen = (canvas.height - imagen.height * escala) / 2;  // Centrar verticalmente
    } else {
        escala = canvas.height / imagen.height;
        xImagen = (canvas.width - imagen.width * escala) / 2;    // Centrar horizontalmente
        yImagen = 0;
    }
    minZoom = escala;
    dibujarImagen();
}

// Dibuja la imagen con la escala y posición actuales
function dibujarImagen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imagen, xImagen, yImagen, imagen.width * escala, imagen.height * escala);
	dibujarCaja();
	dibujarFiguras();
	
}

// Indica si el ratón está dentro del área del mapa
function dentroDelMapa() {
	if(mouseX >= (xImagen + minMapaX * escala) && 
		mouseX <= (xImagen + maxMapaX * escala) && 
		mouseY >= (yImagen + minMapaY * escala)
		&& mouseY <= (yImagen + maxMapaY * escala))	{
		return true;
	} else {
		return false;
	}
}

// Dibuja la caja del extrem superior derecho con la información de la posición del ratón en coordenadas
function dibujarCaja() {

	// Solo se muestra la latitud y longitud cuando se está dentro del mapa
	if(dentroDelMapa())	{
		// Se halla la latitud pasando todo a decimas de segundo
		let latitud = 36 * 6000 + 2000 - ((mouseY - (yImagen + minMapaY * escala)) / (minutoLAT * escala)).toFixed(4) * 100;
		let minutos = Math.floor(latitud % 6000 / 100);
		document.getElementById("latitud").innerHTML = "l: " + Math.floor(latitud / 6000) + "º " + minutos.toLocaleString('es-ES', {minimumIntegerDigits: 2, useGrouping:false}) + "' " + Math.floor((Math.floor(latitud % 6000) - minutos * 100) / 10) + " N";
		let longitud = 6 * 6000 + 2000 - ((mouseX - (xImagen + minMapaX * escala)) / (minutoLON * escala)).toFixed(4) * 100;
		minutos = Math.floor(longitud % 6000 / 100);
		document.getElementById("longitud").innerHTML = "L: " + Math.floor(longitud / 6000).toLocaleString('es-ES', {minimumIntegerDigits: 3, useGrouping:false}) + "º " + minutos.toLocaleString('es-ES', {minimumIntegerDigits: 2, useGrouping:false}) + "' " + Math.floor((Math.floor(longitud % 6000) - minutos * 100) / 10) + " W";;
	}
	
}

// Devolver el angulo en grados que hay en la recta formada por dos puntos
function calcularPendienteEnGrados(x1, y1, x2, y2) {
    // Calcular el ángulo en radianes usando Math.atan2()
    let anguloRad = Math.atan2(y2 - y1, x2 - x1);
    
    // Convertir el ángulo a grados
    let anguloGrados = anguloRad * 180 / Math.PI;
	
    return anguloGrados;
}

// Calcula cual es la posición del borde del mapa según la recta formada por un punto y un ángulo
function calcularBordesMapa(xInicio, yInicio, angulo)
{
	let xFinal, yFinal;
	
	
	let angulo_corregido = angulo
	// Calcular el grado opuesto
	if(angulo < 0)	{
		angulo = Math.abs(angulo);
		if(angulo > 180) {
			angulo_corregido =  angulo - 180;
		} else {
			angulo_corregido = angulo + 180;
		}
	}
	// de 0 vertical a 0 horizontal
	angulo_corregido = angulo_corregido - 90;

	// Convertir el ángulo a radianes
	let anguloRad = angulo_corregido * (Math.PI / 180);

	// Calcular el "pendiente" de la línea en función del ángulo
	let pendiente = Math.tan(anguloRad);

	// Variables de los límites del mapa escalados
	let xMin = minMapaX * escala;
	let xMax = maxMapaX * escala;
	let yMin = minMapaY * escala;
	let yMax = maxMapaY * escala;

	// Calcular las intersecciones posibles con los bordes del mapa en función del ángulo
	if (angulo_corregido >= -90 && angulo_corregido <= 90) {
		// Caso de ángulo hacia la derecha (0 a 90 grados o -90 a 0 grados)
		xFinal = xMax;
		yFinal = yInicio + (xFinal - xInicio) * pendiente;

		if (yFinal < yMin) {
			yFinal = yMin;
			xFinal = xInicio + (yFinal - yInicio) / pendiente;
		} else if (yFinal > yMax) {
			yFinal = yMax;
			xFinal = xInicio + (yFinal - yInicio) / pendiente;
		}
	} else {
		// Caso de ángulo hacia la izquierda (90 a 180 grados o -90 a -180 grados)
		xFinal = xMin;
		yFinal = yInicio + (xFinal - xInicio) * pendiente;

		if (yFinal < yMin) {
			yFinal = yMin;
			xFinal = xInicio + (yFinal - yInicio) / pendiente;
		} else if (yFinal > yMax) {
			yFinal = yMax;
			xFinal = xInicio + (yFinal - yInicio) / pendiente;
		}
	}
	
	return [xFinal, yFinal];
	
}

// Formatea las líneas de posición
function  prepararLineas(color)
{
	ctx.strokeStyle = color;
	ctx.lineWidth = grosorLinea * escala; // Grosor de la línea ajustado según la escala
	ctx.lineCap = "round"; // Mejora el acabado de las líneas
	ctx.globalAlpha = 0.5; // Semi-transparente
	ctx.beginPath();
}

// Dibuja las figuras según del tipo que sean
function dibujarFiguras() {
	// Guardamos el estado del contexto para aplicar transformaciones
	ctx.save();
	ctx.translate(xImagen, yImagen);  // Mover el canvas según el desplazamiento actual

	let xInicio, yInicio, xFinal, yFinal;

	figuras.forEach(function(figura) {
		switch(figura.tipo) {
			case "vertical":
				prepararLineas(figura.color);
				// Calcula la posición X y Y de los bordes del mapa escalados
				xInicio = Math.round((figura.x + minMapaX) * escala);
				let yMapaInicio = Math.round(minMapaY * escala);
				let yMapaFin = Math.round(maxMapaY * escala);

				// Dibuja la línea vertical ajustada
				ctx.moveTo(xInicio, yMapaInicio);
				ctx.lineTo(xInicio, yMapaFin);
				ctx.stroke();
				break;
			case "horizontal":
				prepararLineas(figura.color);
				// Calcula la posición X y Y de los bordes del mapa escalados
				yInicio = Math.round((figura.y + minMapaY) * escala);
				let xMapaInicio = Math.round(minMapaX * escala);
				let xMapaFin = Math.round(maxMapaX * escala);

				// Dibuja la línea vertical ajustada
				ctx.moveTo(xMapaInicio, yInicio);
				ctx.lineTo(xMapaFin, yInicio);
				ctx.stroke();
				break;
			case "circulo":
                prepararLineas(figura.color);
                ctx.beginPath();
                // Calcular las coordenadas y el radio escalado del círculo
                let xCentro = (figura.x + minMapaX) * escala;
                let yCentro = (figura.y + minMapaY) * escala;
                let radioEscalado = figura.radio * escala;  // Radio ajustado a la escala actual
                ctx.arc(xCentro, yCentro, radioEscalado, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.closePath();
                break;		
			case "demora":
				prepararLineas(figura.color);

				// Punto de origen (centro de la demora) en el mapa escalado
				xInicio = (figura.x + minMapaX) * escala;
				yInicio = (figura.y + minMapaY) * escala;
				
				bordes = calcularBordesMapa(xInicio, yInicio, figura.angulo);
				xFinal = bordes[0];
				yFinal = bordes[1];

				// Dibujar la línea desde el centro hacia el borde calculado
				ctx.moveTo(xInicio, yInicio);
				ctx.lineTo(xFinal, yFinal);
				ctx.stroke();
				break;
			case "oposicion":
			case "enfilacion":
			case "distancia_r":
				prepararLineas(figura.color);

				// Calcula la posiciones X y Y de los dos puntos de la recta
				xInicio = Math.round((figura.x + minMapaX) * escala);
				yInicio = Math.round((figura.y + minMapaY) * escala);
				xFinal = Math.round((figura.x2 + minMapaX) * escala);
				yFinal = Math.round((figura.y2 + minMapaY) * escala);
				if(figura.tipo == "enfilacion") {
					let angulo = calcularPendienteEnGrados(xInicio, yInicio, xFinal, yFinal) + 90;
					if (angulo < 0) {
						angulo += 360;
					}
					else if(angulo > 360) {
						angulo -= 360;
					}
					bordes = calcularBordesMapa(xInicio, yInicio, -angulo);
					xFinal = bordes[0];
					yFinal = bordes[1];
					ctx.moveTo(xInicio, yInicio);
					ctx.lineTo(xFinal, yFinal);
					ctx.stroke();
					prepararLineas(figura.color);
					bordes = calcularBordesMapa(xInicio, yInicio, angulo);
					xFinal = bordes[0];
					yFinal = bordes[1];
					ctx.moveTo(xInicio, yInicio);
					ctx.lineTo(xFinal, yFinal);
					ctx.stroke();
				} else {
					ctx.moveTo(xInicio, yInicio);
					ctx.lineTo(xFinal, yFinal);
					ctx.stroke();
					if(figura.tipo == "distancia_r") {
						// Calcular distancia y ángulo
						let distanciaPx = (Math.sqrt(Math.pow((xFinal - xInicio) / escala, 2) + Math.pow((yFinal - yInicio) / escala , 2)) / minutoLAT);
						angulo = calcularPendienteEnGrados(xInicio, yInicio, xFinal, yFinal) + 90;
						if (angulo < 0) {
							angulo += 360;
						}
						else if(angulo > 360) {
							angulo -= 360;
						}
						// Dibujar texto en el canvas justo por encima de la línea
						ctx.font = `${14 * escala}px Arial`;
						ctx.fillStyle = figura.color;
						ctx.fillText(`D: ${distanciaPx.toFixed(1)} millas, Dv: ${angulo.toFixed(1)}°`, (xInicio + xFinal) / 2, (yInicio + yFinal) / 2 - 10);
					}
				}
				break;
		}
	});
	
	ctx.restore();
}




// Llama a la función para establecer el tamaño inicial del canvas y ajustar la imagen
ajustarCanvas();

// Redimensiona el canvas automáticamente y redibuja la imagen al cambiar el tamaño de la ventana
window.addEventListener('resize', () => {
    ajustarCanvas();
    ajustarImagenInicial();
});

// Añade un escuchador para el evento de la rueda del ratón para hacer zoom
canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    let nuevaEscala = escala + (event.deltaY < 0 ? zoomPaso : -zoomPaso);
    nuevaEscala = Math.max(minZoom, Math.min(maxZoom, nuevaEscala));

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    xImagen -= (mouseX - xImagen) * (nuevaEscala - escala) / escala;
    yImagen -= (mouseY - yImagen) * (nuevaEscala - escala) / escala;

    const maxX = (canvas.width - imagen.width * nuevaEscala) / 2;
    const maxY = (canvas.height - imagen.height * nuevaEscala) / 2;

    escala = nuevaEscala;
    dibujarImagen();
});

canvas.addEventListener('mousedown', (event) => {
	mouseX = event.clientX;
	mouseY = event.clientY;    
    switch (event.button) {
		case 0:
			// Si esta dentro del mapa, muestra las coordenadas
			if(dentroDelMapa())	{
				if(!mostrandoRuta) {
					let opciones = document.getElementById("opciones");
					opciones.style.left = event.clientX + "px";
					opciones.style.top = event.clientY + "px";
					opciones.style.display = "block";
					mostrandoOpciones = true;
				} else {
					mostrandoRuta = false;
				}
				
			}
			break;
		// Solo inicia el arrastre si se presiona el botón central del ratón
		case 1:
			estaArrastrando = true;
			startX = event.clientX - xImagen;
			startY = event.clientY - yImagen;
			break;
    }
});

// 
canvas.addEventListener('mousemove', (event) => {
	// Si no se está mostrando la caja de opciones
	if(!mostrandoOpciones)
	{
		mouseX = event.clientX;
		mouseY = event.clientY;
		// Si se esta arrastrando el mapa
		if (estaArrastrando) {
			xImagen = mouseX - startX;
			yImagen = mouseY - startY;
		}
		// Si se está eligiendo donde colocar el segundo punto de enfilaciones, oposiciones y recta enriquecida
		if (mostrandoRuta) {
			figura = figuras[figuras.length - 1];
			figura.x2 = (mouseX - xImagen) / escala - minMapaX;
			figura.y2 = (mouseY - yImagen) / escala - minMapaY;
		}
		// Redibuja la imagen en la nueva posición mientras se arrastra
		dibujarImagen();
	}
});


canvas.addEventListener('mouseup', () => {
	// Ya ha terminado el arrastre del mapa
	if (event.button === 1) {
		estaArrastrando = false;
	}
});

document.getElementById("borrar").addEventListener("click", () => {
	figuras = [];
	ocultarOpciones();
	dibujarImagen();
});

function ocultarOpciones() {
	let opciones = document.getElementById("opciones");
	opciones.style.display = "none";
	mostrandoOpciones = false;
}

document.getElementById("esconder").addEventListener("click", () => {
	ocultarOpciones();
});

window.addEventListener("keyup", (evt) => {
	if (evt.keyCode == 27) ocultarOpciones();
});

function recuperaColor() {
	return document.querySelector('input[name="color"]:checked').value;
}

function dibujarLinea(tipo)
{
	// Convierte las coordenadas del clic en el sistema de coordenadas del mapa
	let xMapa = (mouseX - xImagen) / escala - minMapaX;
	let yMapa = (mouseY - yImagen) / escala - minMapaY;

	// Agrega la figura usando las coordenadas ajustadas
	figuras.push({"tipo":tipo, "x": xMapa, "y": yMapa, "color": recuperaColor()});
	
	ocultarOpciones();
	dibujarImagen();

}

document.getElementById("vertical").addEventListener("click", () => {
	dibujarLinea("vertical");
});

document.getElementById("horizontal").addEventListener("click", () => {
	dibujarLinea("horizontal");
});

// Evita cadenas alfanuméricas
function esNumeroDecimal(cadena) {
    return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(cadena);
}

document.getElementById("distancia").addEventListener("click", () => {
	let valor = document.getElementById("distancia_c").value.replace(",",".");
	if(esNumeroDecimal(valor))	{
		// Convierte las coordenadas del clic en el sistema de coordenadas del mapa
		let xMapa = (mouseX - xImagen) / escala - minMapaX;
		let yMapa = (mouseY - yImagen) / escala - minMapaY;
		
		// Agrega un círculo al array figuras
		figuras.push({
			"tipo": "circulo",
			"x": xMapa,
			"y": yMapa,
			"radio": parseFloat(valor) * minutoLAT,  // Radio de 20 píxeles en escala
			"color": recuperaColor()
		});
		// Oculta el menú de opciones y redibuja el mapa
		ocultarOpciones();
		dibujarImagen();	
    } else {
		alert("Introduzca un número decimal que represente las millas");
	}
});

document.getElementById("demora").addEventListener("click", () => {
	const alerta = "Introduzca un número decimal que represente el grado de la demora entre -359 y 359";
	let valor = document.getElementById("demora_v").value.replace(",",".");
	if(esNumeroDecimal(valor)) {
		demora = parseFloat(valor);
		if(demora > -360 || demora < 360) {
			// Convierte las coordenadas del clic en el sistema de coordenadas del mapa
			let xMapa = (mouseX - xImagen) / escala - minMapaX;
			let yMapa = (mouseY - yImagen) / escala - minMapaY;
			
			// Agrega una demora al array figuras
			figuras.push({
				"tipo": "demora",
				"x": xMapa,
				"y": yMapa,
				"angulo": demora,  // Radio de 20 píxeles en escala
				"color": recuperaColor()
			});
			// Oculta el menú de opciones y redibuja el mapa
			ocultarOpciones();
			dibujarImagen();	
		} else {
			alert(alerta);
		}
    }
	else
	{
		alert(alerta);
	}
});

document.getElementById("oposicion").addEventListener("click", () => {
	mostrandoRuta = true;
	dibujarLinea("oposicion");
});

document.getElementById("enfilacion").addEventListener("click", () => {
	mostrandoRuta = true;
	dibujarLinea("enfilacion");
});

document.getElementById("distancia_r").addEventListener("click", () => {
	mostrandoRuta = true;
	dibujarLinea("distancia_r");
});


