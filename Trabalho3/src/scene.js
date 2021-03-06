var cameraIndex = 0;
var freeCam;


/**
 * Scene constructor
 */
function scene() {
	CGFscene.call(this);
}

scene.prototype = Object.create(CGFscene.prototype);
scene.prototype.constructor = scene;

scene.prototype.set_graph = function(filename){
	obj = new graph(filename,this);
	
	// this.init();
	if(obj != null)
	this.graph = obj;
}


/**
 * Initiates scene before loading .dsx
 *
 * @param  {type} application CGFapplication object
 */
scene.prototype.init = function (application) {
	CGFscene.prototype.init.call(this, application);
	
	this.initCameras();

	this.initLights();

	this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

	this.gl.clearDepth(100.0);
	this.gl.enable(this.gl.DEPTH_TEST);
	this.gl.enable(this.gl.CULL_FACE);
	this.gl.depthFunc(this.gl.LEQUAL);

	this.axis = new CGFaxis(this);
	// this.game = null;

	this.enableTextures(true);
	
	this.game = null;
	
};


/**
 * Initiates default camera view
 */
scene.prototype.initCameras = function () {
    this.camera = new CGFcamera(0.4, 0.1, 500, vec3.fromValues(15, 15, 15), vec3.fromValues(0, 0, 0));
};


/**
 * Initiates default scene lights
 */
scene.prototype.initLights = function () {
	this.lights[0].setPosition(2, 3, 3, 1);
	this.lights[0].setDiffuse(1.0, 1.0, 1.0, 1.0);
	this.lights[0].update();
};


/**
 * Sets default scene material appearence
 */
scene.prototype.setDefaultAppearance = function () {
	this.setAmbient(0.2, 0.4, 0.8, 1.0);
	this.setDiffuse(0.2, 0.4, 0.8, 1.0);
	this.setSpecular(0.2, 0.4, 0.8, 1.0);
	this.setShininess(10.0);
};

/**
 * Handler called when the graph is finally loaded
 */

// As loading is asynchronous, this may be called already after the application has started the run loop
scene.prototype.onGraphLoaded = function () {	
	
	for(var i = 0; i < this.graph.views.length; i++){
		if(this.graph.views[i].id == this.graph.views.default){
			this.camera = this.graph.views[i];
			break;
		}
	}

	this.setGlobalAmbientLight(
		this.graph.ambientLight[0],
		this.graph.ambientLight[1],
		this.graph.ambientLight[2],
		this.graph.ambientLight[3]
	);

	this.gl.clearColor(
		this.graph.background[0],
		this.graph.background[1],
		this.graph.background[2],
		this.graph.background[3]
	);

	this.axis = this.graph.axis;

	var count = 0;
	for (var i = 0; i < this.graph.omniLights.length && count < 8; i++, count++)
	this.copyLight(
		this.lights[count],
		this.graph.omniLights[i]
	);
	for (var i = 0; i < this.graph.spotLights.length && count < 8; i++, count++)
	this.copyLight(
		this.lights[count],
		this.graph.spotLights[i]
	);

	for (var i = 0; i < count; i++)
	this.lights[i].update();

	this.setUpdatePeriod(1);
	
	if(!this.game)
	this.game = new game(this);
};


/**
 * Displays scene on canvas
 */
scene.prototype.display = function () {

	this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

	// Initialize Model-View matrix as identity (no transformation
	this.updateProjectionMatrix();
	this.loadIdentity();

	// Apply transformations corresponding to the camera position relative to the origin
	this.applyViewMatrix();

	// Draw axis
	this.axis.display();

	this.setDefaultAppearance();

	// ---- END Background, camera and axis setup

	// it is important that things depending on the proper loading of the graph
	// only get executed after the graph has loaded correctly.
	// This is one possible way to do it
	if (this.graph.loadedOk) {
		for(var i = 0; i < this.lights.length; i++)
		this.lights[i].update();

	this.game.display();
	
		//Starts going through the graph
		this.runGraph(this.graph.rootNode);
	}
};


/**
 * Recursive Depth First Search that traveses the scene's component tree
 *
 * @param  {type} node Root node object
 */
scene.prototype.runGraph = function (node) {
	this.pushMatrix();

	//Apply material
	node.materials[node.indexActiveMaterial].apply();


	if(node.animations[0] != null)
	if(node.animations[0].update(this.currTime)){
		node.animations.shift();
		if(node.animations[0] != null)
		node.animations[0].update(this.currTime);
	}

	//Apply transformation matrix
	this.multMatrix(node.mat);

	//Draws primitive (if it has one)
	if (node.primitive !== null)
	node.primitive.display();

	//Uses DFS
	for (var i = 0; i < node.children.length; i++)
	this.runGraph(node.children[i]);

	this.popMatrix();
};

scene.prototype.copyLight = function (sceneLight, newLight) {
	sceneLight.customId = newLight.id;
	sceneLight.setPosition(
		newLight.position[0],
		newLight.position[1],
		newLight.position[2],
		newLight.homogeneous
	);
	sceneLight.setAmbient(
		newLight.ambient[0],
		newLight.ambient[1],
		newLight.ambient[2],
		newLight.ambient[3]
	);
	sceneLight.setDiffuse(
		newLight.diffuse[0],
		newLight.diffuse[1],
		newLight.diffuse[2],
		newLight.diffuse[3]
	);
	sceneLight.setSpecular(
		newLight.specular[0],
		newLight.specular[1],
		newLight.specular[2],
		newLight.specular[3]
	);
	newLight.enabled ? sceneLight.enable() : sceneLight.disable();

	if (newLight.type == 'spot') {
		sceneLight.setSpotExponent(newLight.exponent);
		sceneLight.setSpotCutOff(newLight.cutOff);
		sceneLight.setSpotDirection(newLight.direction[0], newLight.direction[1], newLight.direction[2]);
	}

	sceneLight.setVisible(true);
};


/**
 * Changes current view to the next camera perspective
 */
scene.prototype.changeCamera = function () {
	console.log(this.graph.perspCams.length);
	if (cameraIndex >= this.graph.perspCams.length - 1)
	cameraIndex = 0;
	else
	cameraIndex++;

	this.camera = this.graph.perspCams[cameraIndex];
	x = 1;
};


/**
 * Resets camera perspective
 */
scene.prototype.resetCamera = function () {
	this.camera = freeCam;
};

/**
 * Increments every list of materials on the scene's graph
 */
scene.prototype.changeMaterials = function () {
	this.graph.changeNodesMaterialIndex(this.graph.rootNode);
};


/**
 * Sets the current scene time.
 * Used by animations.
 *
 * @param  {type} currTime Current scene time
 */
scene.prototype.update = function(currTime){
	this.currTime = currTime;
	this.game.update(currTime);
};

scene.prototype.logPicking = function ()
{
	if (this.pickMode === false) {
		if (this.pickResults !== null && this.pickResults.length > 0) {
			for (var i=0; i< this.pickResults.length; i++) {
				var obj = this.pickResults[i][0];
				if (obj)
				{
					var customId = this.pickResults[i][1];				
					this.game.picked = customId;
					this.game.calc_highlights();
					var current_player = this.game.current_player();
					if(current_player)
					current_player.picking_play();
					// console.log('Picked ' + customId);
					// console.table(this.game.highlighted);
					
				}
			}
			this.pickResults.splice(0,this.pickResults.length);
		}		
	}
};