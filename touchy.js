/*
	Touchy.js
	Socket-style finger management for touch events

	Jairaj Sethi
*/



(function () {
	/* Make sure I can itereate through arrays */
	var forEach = function () {
		if (Array.prototype.forEach) {
			return function (arr, callback, self) {
				Array.prototype.forEach.call(arr, callback, self);
			};
		}

		else {
			return function (arr, callback, self) {
				for (var i=0, l=arr.length; i<l; i++) {
					if (i in arr) {
						callback.call(self, arr[i], i, arr);
					}
				}
			};
		}
	}();

	/* Make sure I can search through arrays */
	var indexOf = function () {
		if (Array.prototype.indexOf) {
			return function (arr, item, startIndex) {
				return Array.prototype.indexOf.call(arr, item, startIndex);
			};
		}

		else {
			return function (arr, item, startIndex) {
				for (var i=startIndex || 0, len=arr.length; i<len; i++) {
					if ((i in arr) && (arr[i] === item)) {
						return i;
					}
				}

				return -1;
			};
		}
	}();

	/* Make sure I can map arrays */
	var map = function () {
		if (Array.prototype.map) {
			return function (arr, callback, self) {
				return Array.prototype.map.call(arr, callback, self);
			};
		}

		else {
			return function (arr, callback, self) {
				var len = arr.length,
					mapArr = new Array(len);

				for (var i=0; i<len; i++) {
					if (i in arr) {
						mapArr[i] = callback.call(self, arr[i], i, arr);
					}
				}

				return mapArr;
			};
		}
	}();

	/* Make sure I can filter arrays */
	var filter = function () {
		if (Array.prototype.filter) {
			return function (arr, func, self) {
				return Array.prototype.filter.call(arr, func, self);
			};
		}

		else {
			return function (arr, func, self) {
				var filterArr = [];

				for (var val, i=0, len=arr.length; i<len; i++) {
					val = arr[i];

					if ((i in arr) && func.call(self, val, i, arr)) {
						filterArr.push(val);
					}
				}

				return filterArr;
			};
		}
	}();

	/* Bind event listener to element */
	var boundEvents = {};

	function bind (elem, eventName, callback) {
		if (elem.addEventListener) {
			elem.addEventListener(eventName, callback, false);
		}

		else if (elem.attachEvent) {
			var eID = elem.attachEvent('on'+eventName, callback);
			boundEvents[eID] = { name: eventName, callback: callback };
		}
	}

	function unbind (elem, eventName, callback) {
		if (elem.removeEventListener) {
			elem.removeEventListener(eventName, callback, false);
		}

		else if (elem.detachEvent) {
			for (var eID in boundEvents) {
				if ((boundEvents[eID].name === eventName)
						&& (boundEvents[eID].callback === callback)) {
					elem.detachEvent(eID);
					delete boundEvents[eID];
				}
			}
		}
	}



	/* Object to manage a single-finger interactions */
	function Finger (id) {
		this.id        = id;
		this.points    = [];
		this.callbacks = {
			'start': [],
			'move' : [],
			'end'  : []
		};
	}

	/* Bind event listeners to finger movements */
	Finger.prototype.on = function (name, callback) {
		this.callbacks[name].push(callback);
	};

	/* Trigger finger movement event */
	Finger.prototype.trigger = function (name, point) {
		var that = this;

		forEach(this.callbacks[name], function (callback) {
			callback.call(that, point);
		});
	};



	/* Object to manage multiple-finger interactions */
	function Hand (ids) {
		this.fingers = !ids ? [] : map(ids, function (id) {
			return new Finger(id);
		});

		this.callbacks = {
			'start': [],
			'move' : [],
			'end'  : []
		};
	}

	/* Add an active finger to the hand */
	Hand.prototype.add = function (finger) {
		var index = indexOf(this.fingers, finger);

		if (index == -1) {
			this.fingers.push(finger);
		}
	};

	/* Remove an inactive finger from the hand */
	Hand.prototype.remove = function (finger) {
		var index = indexOf(this.fingers, finger);

		if (index != -1) {
			this.fingers.splice(index, 1);
		}
	};

	/* Get finger by id */
	Hand.prototype.get = function (id) {
		var foundFinger;

		forEach(this.fingers, function (finger) {
			if (finger.id == id) {
				foundFinger = finger;
			}
		});

		return foundFinger;
	};

	/* Bind event listeners to finger movements */
	Hand.prototype.on = function (name, callback) {
		this.callbacks[name].push(callback);
	};

	/* Trigger finger movement event */
	Hand.prototype.trigger = function (name, points) {
		var that = this;

		forEach(this.callbacks[name], function (callback) {
			callback.call(that, points);
		});
	};



	/* Convert DOM touch event object to simple dictionary style object */
	function domTouchToObj (touches, time) {
		return map(touches, function (touch) {
			return {
				id: touch.identifier,
				x: touch.pageX,
				y: touch.pageY,
				time: time
			};
		});
	}


	/* Socket-style finger management for multi-touch events */
	function Touchy (elem, settings) {
		if (typeof settings == 'function') {
			settings = { any: settings };
		}

		var mainHand = new Hand(),
			multiHand,
			count = 0;

		bind(elem, 'touchstart', touchstart);
		bind(elem, 'touchmove' , touchmove );
		bind(elem, 'touchend'  , touchend  );

		function touchstart (e) {
			var touches = domTouchToObj(e.touches, e.timeStamp),
				changedTouches = domTouchToObj(e.changedTouches, e.timeStamp);

			mainHandStart(changedTouches);
			multiHandStart(changedTouches, touches);
		}

		function touchmove (e) {
			var touches = domTouchToObj(e.touches, e.timeStamp),
				changedTouches = domTouchToObj(e.changedTouches, e.timeStamp);

			mainHandMove(changedTouches);
			multiHandMove(changedTouches, touches);
		}

		function touchend (e) {
			var touches = domTouchToObj(e.touches, e.timeStamp),
				changedTouches = domTouchToObj(e.changedTouches, e.timeStamp);

			mainHandEnd(changedTouches);
			multiHandEnd(changedTouches, touches);
		}

		/* Handle the start of an individual finger interaction */
		function mainHandStart (changedTouches) {
			var newFingers = [];

			forEach(changedTouches, function (touch) {
				var finger = new Finger(touch.id);
				finger.points.push(touch);
				newFingers.push([finger, touch]);
				mainHand.add(finger);
			});

			forEach(newFingers, function (data) {
				settings.any && settings.any(mainHand, data[0]);
				data[0].trigger('start', data[1]);
			});

			mainHand.trigger('start', changedTouches);
		}

		/* Handle the movement of an individual finger interaction */
		function mainHandMove (changedTouches) {
			var movedFingers = [];

			forEach(changedTouches, function (touch) {
				var finger = mainHand.get(touch.id);
				finger.points.push(touch);
				movedFingers.push([finger, touch]);
			});

			forEach(movedFingers, function (data) {
				data[0].trigger('move', data[1]);
			});

			mainHand.trigger('move', changedTouches);
		}

		/* Handle the end of an individual finger interaction */
		function mainHandEnd (changedTouches) {
			var endFingers = [];

			forEach(changedTouches, function (touch) {
				var finger = mainHand.get(touch.id);
				finger.points.push(touch);
				endFingers.push([finger, touch]);
				mainHand.remove(finger);
			});

			forEach(endFingers, function (data) {
				data[0].trigger('end', data[1]);
			});

			mainHand.trigger('end', changedTouches);
		}

		/* Handle the start of a multi-touch interaction */
		function multiHandStart (changedTouches, touches) {
			multiHandDestroy();
			multiHandRestart(touches);
		}

		/* Handle the movement of a multi-touch interaction */
		function multiHandMove (changedTouches, touches) {
			var movedFingers = [];

			forEach(changedTouches, function (touch) {
				var finger = multiHand.get(touch.id);
				finger.points.push(touch);
				movedFingers.push([finger, touch]);
			});

			forEach(movedFingers, function (data) {
				data[0].trigger('move', data[1]);
			});

			multiHand.trigger('move', changedTouches);
		}

		/* Handle the end of a multi-touch interaction */
		function multiHandEnd (changedTouches, touches) {
			multiHandDestroy();

			var remainingTouches = filter(touches, function (touch) {
				var unChanged = true;

				forEach(changedTouches, function (changedTouch) {
					if (changedTouch.id == touch.id) {
						unChanged = false;
					}
				});

				return unChanged;
			});

			multiHandRestart(remainingTouches);
		}

		/* Create a new hand based on the current touches on the screen */
		function multiHandRestart (touches) {
			if (touches.length == 0) {
				return;
			}

			multiHand = new Hand();
			var newFingers = [];

			forEach(touches, function (touch) {
				var finger = new Finger(touch.id);
				finger.points.push(touch);
				newFingers.push([finger, touch]);
				multiHand.add(finger);
			});

			var func = settings[ {
				1: 'one',
				2: 'two',
				3: 'three',
				4: 'four',
				5: 'five'
			}[ multiHand.fingers.length ] ];

			func && func.apply(window, [multiHand].concat(multiHand.fingers));

			forEach(newFingers, function (data) {
				data[0].trigger('start', data[1]);
			});

			multiHand.trigger('start', touches);
		}

		/* Destroy the current hand regardless of fingers on the screen */
		function multiHandDestroy () {
			if ( !multiHand ) {
				return;
			}

			var points = [];

			forEach(multiHand.fingers, function (finger) {
				var point = finger.points[ finger.points.length - 1 ];
				finger.points.push(point);
				points.push(point);
				finger.trigger('end', finger.point);
			});

			multiHand.trigger('end', points);

			multiHand = null;
		}
	};



	/* Prevent window movement (iOS fix) */
	var preventDefault = function (e) { e.preventDefault() };

	Touchy.stopWindowBounce = function () {
		bind(window, 'touchmove', preventDefault);
	};

	Touchy.startWindowBounce = function () {
		unbind(window, 'touchmove', preventDefault);
	};



	/* Publicise object */
	window.Touchy = Touchy;
})();
