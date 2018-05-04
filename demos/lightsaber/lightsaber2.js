/*
 * ================================================================================================
 * -*- JavaScript -*-
 * File: lightsaber.js
 * Author: Guilherme R. Lampert
 * Created on: 2015-05-22
 * Brief: Main file for the light saber demo.
 *
 * License:
 *  This source code is released under the MIT License.
 *  Copyright (c) 2015 Guilherme R. Lampert.
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 *
 * ================================================================================================
 */

"use strict";

/*
===========================================================
LightSaberDemo module / singleton:
===========================================================
*/
var LightSaberDemo2 = (function () {

	// These are constants.
	var colors = {
		"Blue"    : { bladeGlow : [0.0, 0.0, 0.7, 1.0], bladeStd : [0.9, 0.9, 1.0, 1.0], light : [0.7, 0.7, 1.0, 1.0] },
		"Green"   : { bladeGlow : [0.0, 0.7, 0.0, 1.0], bladeStd : [0.9, 1.0, 0.9, 1.0], light : [0.7, 1.0, 0.7, 1.0] },
		"Red"     : { bladeGlow : [0.7, 0.0, 0.0, 1.0], bladeStd : [1.0, 0.9, 0.9, 1.0], light : [1.0, 0.7, 0.7, 1.0] },
		"Cyan"    : { bladeGlow : [0.0, 0.7, 0.7, 1.0], bladeStd : [0.9, 1.0, 1.0, 1.0], light : [0.7, 1.0, 1.0, 1.0] },
		"Magenta" : { bladeGlow : [0.7, 0.0, 0.7, 1.0], bladeStd : [1.0, 0.9, 1.0, 1.0], light : [1.0, 0.7, 1.0, 1.0] },
		"Yellow"  : { bladeGlow : [0.7, 0.7, 0.0, 1.0], bladeStd : [1.0, 1.0, 0.9, 1.0], light : [1.0, 1.0, 0.7, 1.0] },
		"Var"  	  : { bladeGlow : [0.0, 0.0, 0.0, 1.0], bladeStd : [1.0, 1.0, 1.0, 1.0], light : [1.0, 1.0, 1.0, 1.0] }   //Curt add test
	};

	// Misc:
	var initialized           = false;
	var glowEffect            = null;
	var fxaaShaderProgram     = null;
	var anisoLitShaderProgram = null;
	var lightSaberTrail       = null;
	var lightSaberModel       = null;
	var lightSaberPosition    = vec3.fromValues(0.0, -2.0, -16.0);
	var lightSaberPositionDefault    = vec3.fromValues(0.0, -2.0, -16.0);
	var trailLastTimeExpanded = 0.0;
	var tailExpandIntervalMs  = 2.0;
	var degreesRotationX      = 5.0;
	var degreesRotationZ      = 25.0;
	var zoomAmount            = 0.1;
	var bgSoundLoopVolume     = 0.2;

	// Matrices used to transform the saber model:
	var mIdentity             = mat4.create();
	var mTranslation          = mat4.create();
	var mRotX                 = mat4.create();
	var mRotZ                 = mat4.create();
	var projectionMatrix      = mat4.create();
	var modelMatrix           = mat4.create();
	var mvpMatrix             = mat4.create();

	// Stuff set by the UI:
	var lightSaberIsOn        = false;
	var glowEnabled           = true;
	var trailEnabled          = true;
	var fxaaEnabled           = true;
	var soundEnabled          = true;
	var bladeGlowColor        = colors["Red"].bladeGlow;
	var bladeStdColor         = colors["Red"].bladeStd;
	var lightColor            = colors["Red"].light;

	// We start rotating the saber by itself after a while without user input.
	var autoRotate               = true;   // Starts with an auto rotation
	var autoRotateAmount         = 0.05;   // Units per millisecond
	var autoRotateStartThreshold = 3000.0; // In milliseconds

	// Keeps track of mouse movement and clicks over the GL canvas.
	var mouse = {
		deltaX        : 0,
		deltaY        : 0,
		lastPosX      : 0,
		lastPosY      : 0,
		lastInputTime : 0,
		maxDelta      : 100,
		buttonDown    : false // The left button, actually
	};

	//keep track of hand movement relative to body
	var reckon = {
		deltaX        : 0,
		deltaY        : 0,
		lastPosX      : 0,
		lastPosY      : 0,
		lastInputTime : 0,
		maxDelta      : 100
	};

	var thermBaseline = {
		down 	: 0,
		up 		: 0,
		back 	: 0,
		forward : 0
	}

	/*
	 * Internal helpers:
	 */
	function playSound(soundId, volume) {
		if (soundEnabled) {
			var soundElement = document.getElementById(soundId);
			if (soundElement) {
				if (volume != null) {
					soundElement.volume = volume;
				}
				soundElement.play();
				return true;
			}
			jedi2.logWarning("Failed to play sound '" + soundId + "'!");
		}
		return false;
	}

	function setSoundVolume(soundId, volume) {
		var soundElement = document.getElementById(soundId);
		if (soundElement) {
			soundElement.volume = volume;
			return true;
		}
		return false;
	}

	function updateMouseDeltas(mx, my) {
	//	console.log("updateMouseDeltas(mx, my): " + mx + " " + my); //DEBUG TEST
		mouse.deltaX   = mx - mouse.lastPosX;
		mouse.deltaY   = my - mouse.lastPosY;
		mouse.lastPosX = mx;
		mouse.lastPosY = my;
		mouse.deltaX   = jedi2.clamp(mouse.deltaX, -mouse.maxDelta, +mouse.maxDelta);
		mouse.deltaY   = jedi2.clamp(mouse.deltaY, -mouse.maxDelta, +mouse.maxDelta);
	//	console.log("updateMouseDeltas(mouse.deltaX, mouse.deltaY): " + mouse.deltaX + " " + mouse.deltaY); //DEBUG TEST

		mouse.lastInputTime = jedi2.WebApp2.clockMilliseconds();

		if (lightSaberIsOn && mouse.buttonDown) {
			if (Math.abs(mouse.deltaX) > (mouse.maxDelta / 2) || 
			    Math.abs(mouse.deltaY) > (mouse.maxDelta / 2)) {
				playSound("snd_saber_move", 0.5);
			}
		}
	}

	function hookMouseHandlers() {
		var canvas = document.getElementById("webgl_canvas2");
		if (!canvas) {
			jedi2.logError("Failed to get WebGL canvas element! User input is compromised!");
			return;
		}

		canvas.onmousemove = function (mouseEvent) {
			updateMouseDeltas(mouseEvent.clientX, mouseEvent.clientY);
		};

		canvas.onmousedown = function (mouseEvent) {
			var leftButtonDown = false;
			mouseEvent = mouseEvent || window.event;

			if ("which" in mouseEvent) {
				// Gecko (Firefox), WebKit (Safari/Chrome) & Opera
			    leftButtonDown = (mouseEvent.which == 1);
			} else if ("button" in mouseEvent) {
				// IE, Opera
			    leftButtonDown = (mouseEvent.button == 0);
			}

			mouse.buttonDown    = leftButtonDown;
			mouse.lastInputTime = jedi2.WebApp2.clockMilliseconds();
			autoRotate          = false;
			//console.log("DEBUG TEST VALUES: " + app.sensorValues); //DEBUG TEST
		};

		canvas.onmouseup = function (mouseEvent) {
			mouse.buttonDown = false;
		};

		// Zoom in|out with mouse wheel.
		// Note: `addEventListener` is recommended for compatibility with IE.
		canvas.addEventListener("wheel",
			function (mouseEvent) {
				mouseEvent.preventDefault();
				if (mouseEvent.deltaY > 0) {
					lightSaberPosition[2] += zoomAmount;
				} else if (mouseEvent.deltaY < 0) {
					lightSaberPosition[2] -= zoomAmount;				
				}
			},
			false
		);
	}

	function hookTouchHandlers() {
		var canvas = document.getElementById("webgl_canvas2");
		if (!canvas) {
			jedi2.logError("Failed to get WebGL canvas element! User input is compromised!");
			return;
		}

		var touchStarted = function (touchEvent) {
			touchEvent.preventDefault();
			autoRotate          = false;
			mouse.buttonDown    = true;
			mouse.lastInputTime = jedi2.WebApp2.clockMilliseconds();
		};

		var touchEnded = function (touchEvent) {
			touchEvent.preventDefault();
			mouse.buttonDown = false;
		};

		var touchMoved = function (touchEvent) {
			touchEvent.preventDefault();
			var touches = touchEvent.changedTouches;
			for (var t = 0; t < touches.length; ++t) {
				updateMouseDeltas(touches[t].clientX, touches[t].clientY);
			}
		};

		//
		// https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
		//
		canvas.addEventListener("touchstart",  touchStarted, false);
		canvas.addEventListener("touchmove",   touchMoved,   false);
		canvas.addEventListener("touchend",    touchEnded,   false);
		canvas.addEventListener("touchcancel", touchEnded,   false);
		canvas.addEventListener("touchleave",  touchEnded,   false);
	}

	function hideLoadingAmination() {
		// Uses jQuery to hide the loading gif.
		// This assumes the page has an element with id = 'loading_animation'.
		if (document.getElementById("loading_animation2")) {
			$("#loading_animation2").hide();
		}
	}

	function initShadersAndEffects() {
		var screenDims = [];
		screenDims.push(jedi2.Renderer.getScreenWidth());
		screenDims.push(jedi2.Renderer.getScreenHeight());

		fxaaShaderProgram = jedi2.ResourceManager.findShaderProgram("fxaa");
		jedi2.assert(fxaaShaderProgram, "Missing FXAA shader program!");
		fxaaShaderProgram.bind();
		fxaaShaderProgram.setUniformVec2("u_fb_resolution_vs", screenDims);
		fxaaShaderProgram.setUniformVec2("u_fb_resolution_fs", screenDims);
		fxaaShaderProgram.setUniform1i("u_scene_texture", 0);

		anisoLitShaderProgram = jedi2.ResourceManager.findShaderProgram("anisotropic_lit");
		jedi2.assert(anisoLitShaderProgram, "Missing anisotropic-lit shader program!");
		anisoLitShaderProgram.bind();
		anisoLitShaderProgram.setUniformVec4("u_rp_light_color", lightColor);

		jedi2.ShaderProgram.bindNull();

		glowEffect = new jedi2.GlowEffect();
		glowEffect.initWithParams(512, 512, screenDims[0], screenDims[1], {
			glowBlendMode : jedi2.GlowEffect.ADDITIVE_BLENDING,
			blurAmount    : 20.0,
			blurScale     : 1.9,
			blurStrength  : 0.6
		});
	}

	function initMiscellaneous() {
		// The light saber model:
		lightSaberModel = jedi2.ResourceManager.findModel3D("lightsaber");
		if (!lightSaberModel || lightSaberModel.isDefault()) {
			jedi2.fatalError("Unable to find the light saber model! Aborting.");
		}

		// Trail renderer:
		lightSaberTrail = new jedi2.Polyboard();
		lightSaberTrail.initWithParams(2048, 30.0, 5.0);
		lightSaberTrail.setCameraFacing(false);
		lightSaberTrail.setPointAlphaFadeFactor(0.01);

		// Hook input event handlers:
		hookMouseHandlers(); // Mouse on a desktop computer
		hookTouchHandlers(); // Touch device (mobile)
	}

	function drawSaberHandle(deltaTimeMillisec, materialOverride) {
		jedi2.Renderer.setModelMatrix(modelMatrix);
		jedi2.Renderer.setMvpMatrix(mvpMatrix);
		lightSaberModel.drawModel(
			function (mesh) {
				// Prevent the saber blade mesh from drawing now.
				// We render it later with the glow effect enabled.
				if (mesh.name !== "saber_blade_obj_blade") {
					return true;
				}
				return false;
			}, materialOverride
		);

		// Add points to the trail here to make use of the same 
		// matrices just set by the handle model above.
		//
		if (trailEnabled) {
			// Emmit new points as needed.
			trailLastTimeExpanded += deltaTimeMillisec;
			if (trailLastTimeExpanded >= tailExpandIntervalMs) {

				var trailTop    = vec4.create();
				var trailBase   = vec4.create();
				var trailCenter = vec4.create();

				var offsetPos = vec4.create();
				offsetPos[0]  = lightSaberPosition[0];
				offsetPos[1]  = lightSaberPosition[1];
				offsetPos[2]  = lightSaberPosition[2];
				offsetPos[3]  = 1.0;

				var offsetPosObjsSace = vec4.create();
				vec4.transformMat4(offsetPosObjsSace, offsetPos, jedi2.Renderer.getInvModelMatrix());

				offsetPosObjsSace[1] += 0.5;
				vec4.transformMat4(trailBase, offsetPosObjsSace, jedi2.Renderer.getModelMatrix());

				offsetPosObjsSace[1] += 15.0;
				vec4.transformMat4(trailTop, offsetPosObjsSace, jedi2.Renderer.getModelMatrix());

				vec4.add(trailCenter, trailTop, trailBase);
				vec4.scale(trailCenter, trailCenter, 0.5);

				lightSaberTrail.addPointEx({
						top    : trailTop,
						center : trailCenter,
						base   : trailBase
					},
					vec4.clone(bladeGlowColor)
				);

				trailLastTimeExpanded -= tailExpandIntervalMs;
			}
		}
	}

	function drawSaberBlade(passId, materialOverride) {
		jedi2.Renderer.setModelMatrix(modelMatrix);
		jedi2.Renderer.setMvpMatrix(mvpMatrix);
		lightSaberModel.drawModel(
			function (mesh) {
				// If drawing the standard shaded pass, we render the blade nearly white.
				// When drawing the glow, then apply the full blade color.
				// Any other meshes besides the blade mesh are NOT drawn in this pass.
				if (mesh.name === "saber_blade_obj_blade") {
					if (passId === "standard") {
						mesh.material.setDiffuseColor(bladeStdColor);
					} else {
						mesh.material.setDiffuseColor(bladeGlowColor);
					}
					return true;
				}
				return false;
			}, materialOverride
		);
	}

	function renderSceneStandard(deltaTimeMillisec, materialOverride) {
		// Saber + blade, standard shading.
		drawSaberHandle(deltaTimeMillisec, materialOverride);
		if (lightSaberIsOn) {
			drawSaberBlade("standard", materialOverride);
		}
	}

	function renderSceneGlowOnly() {
		if (lightSaberIsOn && glowEnabled) {
			// Blade only (the glowing part).
			drawSaberBlade("glow", null);
		}

		if (lightSaberIsOn && trailEnabled) {
			// Make the trail a glowing object.
			jedi2.Renderer.setModelMatrix(mIdentity);
			jedi2.Renderer.setMvpMatrix(projectionMatrix);
			lightSaberTrail.draw();
		}
	}

	function updateLightShaderColor(color) {
		// This shader param is not updated by the Material. Must be done manually.
		anisoLitShaderProgram.bind();
		anisoLitShaderProgram.setUniformVec4("u_rp_light_color", color || lightColor);
		jedi2.ShaderProgram.bindNull();	
	}

	/*
	 * Public interface:
	 */
	return {

	deadReckon  : function (forward, down, up, back, hand, init){
		if (!initialized) {
			return;
		}

		if(init){
			thermBaseline.down = down;
			thermBaseline.up = up;
			thermBaseline.back = back;
			thermBaseline.forward = forward;
		}

		reckon.deltaX   = ((forward - thermBaseline.forward) - (back - thermBaseline.back))  - reckon.lastPosX;
		reckon.deltaY   = ((up - thermBaseline.up) - (down - thermBaseline.down)) - reckon.lastPosY;
		console.log("Delta forward/back: " + reckon.deltaX + "Delta up/down: " + reckon.deltaY);
		reckon.lastPosX = ((forward - thermBaseline.forward) - (back - thermBaseline.back));
		reckon.lastPosY = ((up - thermBaseline.up) - (down - thermBaseline.down));
		reckon.deltaX   = jedi2.clamp(reckon.deltaX, -reckon.maxDelta, +reckon.maxDelta);
		reckon.deltaY   = jedi2.clamp(reckon.deltaY, -reckon.maxDelta, +reckon.maxDelta);

	},

	updateSensorDeltas  : function (mx, my) { //x is pitch
		// ROTATION SETTING POINTING FORWARDS X=270 Z=0
		//both pitch and roll are around 115 with hand up in front
		if (!initialized) {
			return;
		}
		mouse.buttonDown = true;
	//	console.log("updateMouseDeltas(mx, my): " + mx + " " + my); //DEBUG TEST
		mouse.deltaX   = mx - mouse.lastPosX;
		mouse.deltaY   = my - mouse.lastPosY;
		mouse.lastPosX = mx;
		mouse.lastPosY = my;
		mouse.deltaX   = jedi2.clamp(mouse.deltaX, -mouse.maxDelta, +mouse.maxDelta);
		mouse.deltaY   = jedi2.clamp(mouse.deltaY, -mouse.maxDelta, +mouse.maxDelta);
	//	console.log("updateMouseDeltas(mouse.deltaX, mouse.deltaY): " + mouse.deltaX + " " + mouse.deltaY); //DEBUG TEST */

		//SET MASTER ROTATION
	//	degreesRotationZ = 200 - mx;
	//	degreesRotationX = 360 - my;

		mouse.lastInputTime = jedi2.WebApp2.clockMilliseconds();

		autoRotate = false;

		if (lightSaberIsOn && mouse.buttonDown) {
			if (Math.abs(mouse.deltaX) > (mouse.maxDelta / 2) || 
			    Math.abs(mouse.deltaY) > (mouse.maxDelta / 2)) {  //227, -101   X/Z      200, 100   roll pitch    ideal  90, 155
				playSound("snd_saber_move", 0.5);
			}
		}
	},

	thermopileBladeColor : function (thermo1, thermo2, thermo3, thermo4, colorName) {   //Curt custom function

			jedi2.assert(colorName, "Null color name/id!");
			if (!initialized) {
				return;
			}

			var highTemp;
			//get highest thermopile value
			if(thermo1 > thermo2 && thermo1 > thermo3 && thermo1 > thermo4) highTemp = thermo1;
			else if(thermo2 > thermo1 && thermo2 > thermo3 && thermo2 > thermo4) highTemp = thermo2;
			else if(thermo3 > thermo1 && thermo3 > thermo2 && thermo3 > thermo4) highTemp = thermo3;
			else highTemp = thermo4;
		//	console.log("high thermo: " + highTemp);

			//narrow color shift temp range
			if(highTemp > 90.99){ highTemp = 4.98; }
			else if(highTemp < 86.01){ highTemp = 0.02; }
			else{ highTemp = highTemp - 85; }

			var multHot = highTemp / 5;
			var multCold = 1 - multHot;

			bladeGlowColor = [(0.7 * multHot), 0.0, (0.7 * multCold), 1.0];
			bladeStdColor  = [(0.9 + (0.1 * multHot)), 1.0, (0.9 + (0.1 * multCold)), 1.0];
			lightColor     = [(0.7 + (0.3 * multHot)), 1.0, (0.7 + (0.3 * multCold)), 1.0];

			//bladeGlowColor = colors[colorName].bladeGlow;
		//	bladeStdColor  = colors[colorName].bladeStd;
		//	lightColor     = colors[colorName].light;

			if (lightSaberIsOn) {
				updateLightShaderColor();
			}

			// If we don't reset it, there could be leftovers from the previous trail. 
			if(highTemp < 86.5){lightSaberTrail.clearPoints(); }
		},

		bodySensor : function () {
			if (!initialized) {
				return;
			}
		},

		toggleGlow : function () {
			glowEnabled = !glowEnabled;
		},

		toggleFxaa : function () {
			fxaaEnabled = !fxaaEnabled;
		},

		toggleSound : function () {
			if (!initialized) {
				return;
			}

			soundEnabled = !soundEnabled;
			// Set to background sound volume to zero to mute it,
			// or restore the default volume.
			if (!soundEnabled) {
				setSoundVolume("snd_saber_loop", 0.0);
			} else {
				if (lightSaberIsOn) {
					setSoundVolume("snd_saber_loop", bgSoundLoopVolume);
				}
			}
		},

		toggleTrail : function () {
			if (!initialized) {
				return;
			}

			trailEnabled = !trailEnabled;
			if (!trailEnabled) {
				lightSaberTrail.clearPoints();
			}
		},

		saberOn : function () {
			if (!initialized) {
				return;
			}

			if (!lightSaberIsOn) {
				lightSaberIsOn = true;

				playSound("snd_saber_on");
				if (soundEnabled) {
					setSoundVolume("snd_saber_loop", bgSoundLoopVolume);
				}

				updateLightShaderColor();
			}
		},

		saberOff : function () {
			if (!initialized) {
				return;
			}

			if (lightSaberIsOn) {
				lightSaberIsOn = false;

				playSound("snd_saber_off");
				setSoundVolume("snd_saber_loop", 0.0);

				updateLightShaderColor([1.0, 1.0, 1.0, 1.0]);
				lightSaberTrail.clearPoints();
			}
		},

		setBladeColor : function (colorName) {
			jedi2.assert(colorName, "Null color name/id!");
			if (!initialized) {
				return;
			}

			bladeGlowColor = colors[colorName].bladeGlow;
			bladeStdColor  = colors[colorName].bladeStd;
			lightColor     = colors[colorName].light;

			if (lightSaberIsOn) {
				updateLightShaderColor();
			}

			// If we don't reset it, there could be leftovers from the previous trail. 
			lightSaberTrail.clearPoints();
		},

		onExit : function () {
			projectionMatrix      = null;
			glowEffect            = null;
			fxaaShaderProgram     = null;
			anisoLitShaderProgram = null;
			lightSaberTrail       = null;
			lightSaberModel       = null;
			lightSaberPosition    = null;
			initialized           = false;
		},

		onResourcesLoaded : function () {
			//
			// Make sure the loading animation displays for at least 
			// five seconds (roughly the time for two animation loops). 
			// Since we are not loading a lot of data, it might be over 
			// before the user even notices it, without this extra delay.
			//
			window.setTimeout(function() {
				mat4.perspective(projectionMatrix, glMatrix.toRadian(60.0), 
				                 jedi2.Renderer.getAspect(), 1.0, 250.0);

				initShadersAndEffects();
				initMiscellaneous();
				initialized = true;

				// Once done, remove the loading animation overlay.
				hideLoadingAmination();

				// "Turn on" the laser blade.
				LightSaberDemo2.saberOn();

				// Sound is set to loop forever. Lowest volume to be a background sound.
				playSound("snd_saber_loop", bgSoundLoopVolume);

				jedi2.WebApp2.run();
			}, 5000);
		},

		onUpdate : function (deltaTimeMillisec) {
			if (!lightSaberModel || !initialized) {
				return;
			}

			lightSaberTrail.update(deltaTimeMillisec);

			//
			// Position the saber model (update the matrices):
			//
			mat4.identity(mTranslation);
			mat4.identity(mRotX);
			mat4.identity(mRotZ);
			mat4.identity(modelMatrix);
			mat4.identity(mvpMatrix);

			mat4.translate(mTranslation, mTranslation, lightSaberPosition);
			mat4.rotateX(mRotX, mRotX, glMatrix.toRadian(degreesRotationX));
			mat4.rotateZ(mRotZ, mRotZ, glMatrix.toRadian(degreesRotationZ));

			mat4.multiply(modelMatrix, mRotZ, mRotX);
			mat4.multiply(modelMatrix, mTranslation, modelMatrix);
			mat4.multiply(mvpMatrix, projectionMatrix, modelMatrix);

			/**************** CONTROLL WITH EEG NEURAL NETWORK ***************/
			/**************** CONTROLL WITH EEG NEURAL NETWORK ***************/
			/**************** CONTROLL WITH EEG NEURAL NETWORK ***************/
			if (haveNNFlag2 && activeNNFlag2){
				autoRotate = false;

                degreesRotationX = ( (sithNeural / 100) * 120) - 105;
				degreesRotationZ = ( (sithNeural / 100) * 120) - 60;


				degreesRotationZ = jedi.clamp(degreesRotationZ, -360.0, +360.0);
				degreesRotationX = jedi.clamp(degreesRotationX, -360.0, +360.0);

				console.log("RotX:" + degreesRotationX + " RotZ:" + degreesRotationZ);

				if(sithNeural > 40){
					glowEnabled           = true;
					trailEnabled          = true;
				} else {
					glowEnabled           = false;
					trailEnabled          = false;					
				}

			} else {

				if (mouse.buttonDown) {
					degreesRotationZ -= mouse.deltaX;
					degreesRotationX += mouse.deltaY;
					mouse.deltaX = mouse.deltaY = 0;
					degreesRotationZ = jedi2.clamp(degreesRotationZ, -360.0, +360.0);
					degreesRotationX = jedi2.clamp(degreesRotationX, -360.0, +360.0);
				} else {
					if ((jedi2.WebApp2.clockMilliseconds() - mouse.lastInputTime) > autoRotateStartThreshold) {
						// Start a default rotation after a while if no new user input is detected.
						autoRotate = true;
					}
				}

				if (autoRotate) {
					degreesRotationX += (autoRotateAmount * deltaTimeMillisec);
					degreesRotationZ += (autoRotateAmount * deltaTimeMillisec);
					if (degreesRotationX >= 360.0) { degreesRotationX = 0.0; }
					if (degreesRotationZ >= 360.0) { degreesRotationZ = 0.0; }
				}
			}

		//	console.log("degreesRotationX: " + degreesRotationX + " degreesRotationZ: " + degreesRotationZ); //DEBUG DEBUG

		},

		onRender : function (deltaTimeMillisec) {
			if (!lightSaberModel || !initialized) {
				return;
			}

			// Step 1: Render the scene to off-screen texture using a standard T&L shader.
			//
			glowEffect.doPass(jedi2.GlowEffect.PASS_STD_RENDER);
			renderSceneStandard(deltaTimeMillisec);

			// Step 2: Render the glowing objects to a separate texture (generate the glow map).
			//
			glowEffect.doPass(jedi2.GlowEffect.PASS_GLOWMAP_GEN);
			renderSceneGlowOnly();

			// Step 3: Blur the glow map.
			//
			glowEffect.doPass(jedi2.GlowEffect.PASS_GLOWMAP_BLUR);

			// Pass 4: Blend the glow map with the rendered scene from #1 to compose the final image.
			//
			glowEffect.doPass(jedi2.GlowEffect.PASS_COMPOSE_FINAL);

			// Finally present to scene to the screen framebuffer,
			// optionally applying a quick FXAA anti-aliasing filter.
			//
		//	console.log("lightsaber2.js jedi2.Renderer.presentFramebuffer");
			if (fxaaEnabled) {  
				jedi2.Renderer.presentFramebufferWithPostEffect(
					fxaaShaderProgram, glowEffect.getOutputFramebuffer());
			} else { 
				jedi2.Renderer.presentFramebuffer(
					glowEffect.getOutputFramebuffer());
			}    
		}
	};
}());
