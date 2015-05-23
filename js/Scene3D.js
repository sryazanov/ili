function Scene3D() {
    this._listeners = [];
    this._scene = new THREE.Scene();
    this._light1 = new THREE.PointLight(0xffffff, 1, 0);
    this._light1.position.set(-100, 100, 500);
    this._light2 = new THREE.DirectionalLight(0xffffff, 0.8);
    this._light2.position.set(0, 1, 0);
    this._light3 = new THREE.DirectionalLight(0xffffff, 1);
    this._light3.position.set(0, -1, 0);
    this._mesh = null;
    this._meshContainer = new THREE.Object3D();
    this._color = new THREE.Color('#575757');
    this._backgroundColor = new THREE.Color('black');
    this._meshMaterial = new THREE.MeshLambertMaterial({
        vertexColors: THREE.VertexColors,
        transparent: true,
        opacity: 0.9,
        shininess: 3,
        shading: THREE.SmoothShading
    });

    this._spotBorder = 0.05;
    this._colorMap = null;
    this._rotation = new THREE.Euler();
    this._rotation.onChange(this._onRotationChange.bind(this));
    this._animationFrameStart = undefined;

    this._spots = null;
    this._mapping = null;

    this._scene.add(this._light1);
    this._scene.add(this._light2);
    this._scene.add(this._light3);
    this._scene.add(new THREE.AxisHelper(20));
    this._scene.add(this._meshContainer);
};

Scene3D.prototype = Object.create(null, {
    addEventListener: {
        value: function(eventName, listener) {
            if (eventName == 'change')
            this._listeners.push(listener);
        }
    },

    clone: {
        value: function(eventName, listener) {
            var result = new Scene3D();
            result.lightIntensity1 = this.lightIntensity1;
            result.lightIntensity2 = this.lightIntensity2;
            result.lightIntensity3 = this.lightIntensity3;
            result.color = this.color;
            result.backgroundColor = this.backgroundColor;
            result.spotBorder = this.spotBorder;
            result.colorMap = this.colorMap;
            result.rotation.copy(this.rotation);
            var geometry = new THREE.BufferGeometry();
            for (var i in this.geometry.attributes) {
                var a = this.geometry.attributes[i];
                geometry.addAttribute(i, new THREE.BufferAttribute(a.array, a.itemSize));
            }
            result.geometry = geometry;
            result.spots = this.spots;
            result.mapping = this.mapping;
            return result;
        }
    },

    lightIntensity1: {
        get: function() {
            return this._light1.intensity;
        },

        set: function(value) {
            this._light1.intensity = value;
            this._notifyChange();
        }
    },

    lightIntensity2: {
        get: function() {
            return this._light2.intensity;
        },

        set: function(value) {
            this._light2.intensity = value;
            this._notifyChange();
        }
    },

    lightIntensity3: {
        get: function() {
            return this._light3.intensity;
        },

        set: function(value) {
            this._light3.intensity = value;
            this._notifyChange();
        }
    },

    color: {
        get: function() {
            return '#' + this._color.getHexString();
        },

        set: function(value) {
            var color = new THREE.Color(value);
            if (color.equals(this._color)) return;
            this._color.set(color);
            if (this._mesh) {
                this._recolor();
                this._notifyChange();
            }
        }
    },

    backgroundColor: {
        get: function() {
            return '#' + this._backgroundColor.getHexString();
        },

        set: function(value) {
            var color = new THREE.Color(value);
            if (color.equals(this._backgroundColor)) return;
            this._backgroundColor.set(color);
            this._notifyChange();
        }
    },

    backgroundColorValue: {
        get: function() {
            return this._backgroundColor;
        }
    },

    spotBorder: {
        get: function() {
            return this._spotBorder;
        },

        set: function(value) {
            if (this._spotBorder == value) return;
            if (value < 0.0) value = 0.0;
            if (value > 1.0) value = 1.0;
            this._spotBorder = value;
            if (this._mesh) {
                this._recolor();
                this._notifyChange();
            }
        }
    },

    rotation: {
        get: function() {
            return this._rotation;
        },
    },

    spots: {
        get: function() {
            return this._spots;
        },

        set: function(value) {
            if (value) {
                this._spots = new Array(value.length);
                for (var i = 0; i < value.length; i++) {
                    this._spots[i] = {
                        x: value[i].x,
                        y: value[i].y,
                        z: value[i].z,
                        r: value[i].r,
                        intensity: value[i].intensity,
                        color: new THREE.Color(),
                        name: value[i].name,
                    };
                }
            } else {
                this._spots = null;
            }
            if (this._mapping) {
                this._mapping = null; // Mapping is obsolete.

                if (this._mesh) {
                    this._recolor();
                    this._notifyChange();
                }
            }
        }
    },

    updateIntensities: {
        value: function(spots) {
            if (!this._spots) return;

            for (var i = 0; i < this._spots.length; i++) {
                this._spots[i].intensity = spots[i].intensity;
            }
            if (this._mesh && this._mapping) {
                this._recolor();
                this._notifyChange();
            }
        }
    },

    mapping: {
        get: function() {
            return this._mapping;
        },

        set: function(value) {
            if (!this._spots) throw "Mapping donesn't make sense without spots";
            this._mapping = value;
            if (this._mesh) {
                this._recolor();
                this._notifyChange();
            }
        }
    },

    geometry: {
        get: function() {
            return this._mesh ? this._mesh.geometry : null;
        },

        set: function(geometry) {
            if (!this._mesh && !geometry) return;
            if (this._mesh) this._meshContainer.remove(this._mesh);
            this._mapping = null;
            if (geometry) {
                geometry.computeBoundingBox();
                this._mesh = new THREE.Mesh(geometry, this._meshMaterial);
                this._mesh.position.copy(geometry.boundingBox.center().negate());
                this._meshContainer.add(this._mesh);
                this._recolor();
            } else {
                this._mesh = null;
            }
            this._notifyChange();
        }
    },

    colorMap: {
        get: function() {
            return this._colorMap;
        },

        set: function(value) {
            this._colorMap = value;
            if (this._mesh && this._spots && this._mapping) {
                this._recolor();
                this._notifyChange();
            }
        }
    },

    position: {
        get: function() {
            return this._scene.position;
        }
    },

    render: {
        value: function(renderer, camera) {
            renderer.render(this._scene, camera);
        }
    },

    raycast: {
        value: function(raycaster) {
            if (!this._mesh || !this._spots || !this._mapping) return null;
            var message = {
                positions: this._mesh.geometry.attributes.position.array,
                origin: new THREE.Vector3().copy(raycaster.ray.origin),
                direction: new THREE.Vector3().copy(raycaster.ray.direction),
                matrixWorld: new THREE.Matrix4().copy(this._mesh.matrixWorld),
            };
            var closestSpotIndeces = this._mapping.closestSpotIndeces;
            var spots = this._spots;
            var worker = new Worker('js/workers/Raycaster.js');

            var promise = new Promise(function(accept, reject) {
                worker.onmessage = function(event) {
                    worker.terminate();
                    var face = event.data;
                    var spotIndex = -1;
                    for (var i in (face || {})) {
                        if (closestSpotIndeces[face[i]] >= 0) {
                            spotIndex = closestSpotIndeces[face[i]];
                            break;
                        }
                    }
                    accept(spots[spotIndex]);
                };
                worker.onerror = function(event) {
                    console.log('Reycasting failed', event);
                    worker.terminate();
                    reject();
                };
                worker.postMessage(message);
            });

            Object.defineProperty(promise, 'cancel', {
                value: function() {
                    worker.terminate();
                }
            });

            return promise;
        }
    },

    spotToWorld: {
        value: function(spot) {
            if (!this._mesh) return null;

            var position = new THREE.Vector3(spot.x, spot.y, spot.z);
            position.applyMatrix4(this._mesh.matrixWorld);
            return position;
        }
    },

    _recolor: {
        value: function() {
            var startTime = new Date();
            var geometry = this.geometry;
            var mapping = this.mapping;
            var spots = this.spots;

            var position = geometry.getAttribute('position');
            var positionCount = position.array.length / position.itemSize;

            if (mapping) {
                for (var i = 0; i < spots.length; i++) {
                    if (!isNaN(spots[i].intensity)) {
                        this._colorMap.map(spots[i].color, spots[i].intensity);
                    }
                }
            }

            if (!geometry.getAttribute('color')) {
                geometry.addAttribute('color', new THREE.BufferAttribute(
                        new Float32Array(positionCount * 3), 3));
            }
            var color = geometry.getAttribute('color').array;

            // Fill |color| with this._color.
            if (positionCount) {
                var CHUNK_SIZE = 64;
                var last = 0;
                if (positionCount > CHUNK_SIZE) {
                    for (var i = 0; i < CHUNK_SIZE; i++) {
                        this._color.toArray(color, i * 3);
                    }
                    var chunk = new Float32Array(color.buffer, 0, CHUNK_SIZE * 3);
                    for (var i = CHUNK_SIZE; i <= positionCount - CHUNK_SIZE; last = i, i+= CHUNK_SIZE) {
                        color.set(chunk, i * 3);
                    }
                }
                for (var i = last; i < positionCount; i++) {
                    this._color.toArray(color, i * 3);
                }
            }

            if (mapping) {
                var spotBorder = 1.0 - this._spotBorder;
                var closestSpotIndeces = mapping.closestSpotIndeces;
                var closestSpotDistances = mapping.closestSpotDistances;
                for (var i = 0; i < positionCount; i++) {
                    var index = closestSpotIndeces[i];
                    if (index >= 0) {
                        var spot = spots[index];
                        if (!isNaN(spot.intensity)) {
                            var alpha = 1.0 - spotBorder * closestSpotDistances[i];
                            var base = i * 3;
                            color[base + 0] += (spot.color.r - color[base + 0]) * alpha;
                            color[base + 1] += (spot.color.g - color[base + 1]) * alpha;
                            color[base + 2] += (spot.color.b - color[base + 2]) * alpha;
                        }
                    }
                }
            }

            geometry.getAttribute('color').needsUpdate = true;

            var endTime = new Date();
            console.log('Recoloring time: ' +
                    (endTime.valueOf() - startTime.valueOf()) / 1000);
        }
    },

    _applyRotation: {
      value: function() {
        this._meshContainer.rotation.x = this._rotation.x * Math.PI / 180;
        this._meshContainer.rotation.y = this._rotation.y * Math.PI / 180;
        this._meshContainer.rotation.z = this._rotation.z * Math.PI / 180;
        this._meshContainer.updateMatrix();
      }
    },

    _onRotationChange: {
        value: function() {
            if (this._mesh) {
                this._applyRotation();
                this._notifyChange();
            }
        }
    },

    _notifyChange: {
        value: function() {
            var listeners = this._listeners;
            for (var i = 0; i < listeners.length; i++) {
                listeners[i]();
            }
        }
    },
});
