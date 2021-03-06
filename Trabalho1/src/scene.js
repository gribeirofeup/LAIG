var cameraIndex = 0;
var freeCam;

function scene() {
	CGFscene.call(this);
}

scene.prototype = Object.create(CGFscene.prototype);
scene.prototype.constructor = scene;

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

	this.enableTextures(true);
};

scene.prototype.initLights = function () {
	this.lights[0].setPosition(2, 3, 3, 1);
	this.lights[0].setDiffuse(1.0, 1.0, 1.0, 1.0);
	this.lights[0].update();
};

scene.prototype.initCameras = function () {
	freeCam = new CGFcamera(0.4, 0.1, 500, vec3.fromValues(15, 15, 15), vec3.fromValues(0, 0, 0));
	this.camera = freeCam;
};

scene.prototype.setDefaultAppearance = function () {
	this.setAmbient(0.2, 0.4, 0.8, 1.0);
	this.setDiffuse(0.2, 0.4, 0.8, 1.0);
	this.setSpecular(0.2, 0.4, 0.8, 1.0);
	this.setShininess(10.0);
};

// Handler called when the graph is finally loaded.
// As loading is asynchronous, this may be called already after the application has started the run loop
scene.prototype.onGraphLoaded = function () {
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
};

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

		//cil.display();


		//Starts going through the graph
		this.runGraph(this.graph.rootNode);
	};
};

scene.prototype.runGraph = function (node) {
	this.pushMatrix();

	//Apply material
	node.materials[node.indexActiveMaterial].apply();

	//Apply transformation matrix
	this.multMatrix(node.mat);

	//Draws primitive (if it has one)
	if (node.primitive != null)
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
}

scene.prototype.changeCamera = function () {
	console.log(this.graph.perspCams.length);
	if (cameraIndex >= this.graph.perspCams.length - 1)
	cameraIndex = 0;
	else
	cameraIndex++;

	this.camera = this.graph.perspCams[cameraIndex];
	x = 1;
}

scene.prototype.resetCamera = function () {
	this.camera = freeCam;
}

scene.prototype.changeMaterials = function () {
	this.graph.changeNodesMaterialIndex(this.graph.rootNode);
}
