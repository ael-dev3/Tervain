import{A as e,At as t,B as n,Bt as r,C as i,Ct as a,Et as o,H as s,I as c,It as l,Jt as u,Lt as d,M as f,N as p,Nt as m,O as h,P as g,Pt as _,Qt as v,Rt as y,S as ee,St as te,Vt as ne,Xt as re,Zt as b,_ as ie,_n as ae,_t as x,an as oe,cn as se,ct as ce,d as le,en as ue,et as de,gn as S,gt as fe,hn as pe,ht as C,i as me,jt as he,l as ge,ln as _e,lt as ve,m as ye,mt as be,nn as xe,o as Se,on as Ce,pt as we,qt as Te,rt as Ee,s as De,sn as Oe,tn as ke,tt as Ae,un as je,ut as Me,v as Ne,vn as Pe,vt as Fe,y as Ie,yt as Le,z as Re,zt as ze}from"./three.module-B4qovCDo.js";import{n as Be,t as Ve}from"./GLTFLoader-A_yvEm5p.js";var He={type:`change`},Ue={type:`start`},We={type:`end`},Ge=new Te,Ke=new _,qe=Math.cos(70*C.DEG2RAD),w=new S,Je=2*Math.PI,T={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Ye=1e-6,Xe=class extends ee{constructor(e,t=null){super(e,t),this.state=T.NONE,this.target=new S,this.cursor=new S,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:`ArrowLeft`,UP:`ArrowUp`,RIGHT:`ArrowRight`,BOTTOM:`ArrowDown`},this.mouseButtons={LEFT:we.ROTATE,MIDDLE:we.DOLLY,RIGHT:we.PAN},this.touches={ONE:Oe.ROTATE,TWO:Oe.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle=`auto`,this._domElementKeyEvents=null,this._lastPosition=new S,this._lastQuaternion=new r,this._lastTargetPosition=new S,this._quat=new r().setFromUnitVectors(e.up,new S(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new oe,this._sphericalDelta=new oe,this._scale=1,this._panOffset=new S,this._rotateStart=new pe,this._rotateEnd=new pe,this._rotateDelta=new pe,this._panStart=new pe,this._panEnd=new pe,this._panDelta=new pe,this._dollyStart=new pe,this._dollyEnd=new pe,this._dollyDelta=new pe,this._dollyDirection=new S,this._mouse=new pe,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Qe.bind(this),this._onPointerDown=Ze.bind(this),this._onPointerUp=$e.bind(this),this._onContextMenu=ot.bind(this),this._onMouseWheel=nt.bind(this),this._onKeyDown=rt.bind(this),this._onTouchStart=it.bind(this),this._onTouchMove=at.bind(this),this._onMouseDown=et.bind(this),this._onMouseMove=tt.bind(this),this._interceptControlDown=st.bind(this),this._interceptControlUp=ct.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e===`grab`?this.domElement.style.cursor=`grab`:this.domElement.style.cursor=`auto`}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener(`pointerdown`,this._onPointerDown),this.domElement.addEventListener(`pointercancel`,this._onPointerUp),this.domElement.addEventListener(`contextmenu`,this._onContextMenu),this.domElement.addEventListener(`wheel`,this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener(`keydown`,this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction=`none`}disconnect(){this.state=T.NONE,this.domElement.removeEventListener(`pointerdown`,this._onPointerDown),this.domElement.ownerDocument.removeEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.removeEventListener(`pointerup`,this._onPointerUp),this.domElement.removeEventListener(`pointercancel`,this._onPointerUp),this.domElement.removeEventListener(`wheel`,this._onMouseWheel),this.domElement.removeEventListener(`contextmenu`,this._onContextMenu),this.stopListenToKeyEvents();let e=this.domElement.getRootNode();e.removeEventListener(`keydown`,this._interceptControlDown,{capture:!0}),e.removeEventListener(`keyup`,this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction=``,this.domElement.style.cursor=`auto`}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener(`keydown`,this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener(`keydown`,this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(He),this.update(),this.state=T.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){let t=this.object.position;w.copy(t).sub(this.target),w.applyQuaternion(this._quat),this._spherical.setFromVector3(w),this.autoRotate&&this.state===T.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(n)&&isFinite(r)&&(n<-Math.PI?n+=Je:n>Math.PI&&(n-=Je),r<-Math.PI?r+=Je:r>Math.PI&&(r-=Je),n<=r?this._spherical.theta=Math.max(n,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+r)/2?Math.max(n,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let i=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let e=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),i=e!=this._spherical.radius}if(w.setFromSpherical(this._spherical),w.applyQuaternion(this._quatInverse),t.copy(this.target).add(w),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let e=null;if(this.object.isPerspectiveCamera){let t=w.length();e=this._clampDistance(t*this._scale);let n=t-e;this.object.position.addScaledVector(this._dollyDirection,n),this.object.updateMatrixWorld(),i=!!n}else if(this.object.isOrthographicCamera){let t=new S(this._mouse.x,this._mouse.y,0);t.unproject(this.object);let n=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),i=n!==this.object.zoom;let r=new S(this._mouse.x,this._mouse.y,0);r.unproject(this.object),this.object.position.sub(r).add(t),this.object.updateMatrixWorld(),e=w.length()}else console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled.`),this.zoomToCursor=!1;e!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(e).add(this.object.position):(Ge.origin.copy(this.object.position),Ge.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Ge.direction))<qe?this.object.lookAt(this.target):(Ke.setFromNormalAndCoplanarPoint(this.object.up,this.target),Ge.intersectPlane(Ke,this.target))))}else if(this.object.isOrthographicCamera){let e=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),e!==this.object.zoom&&(this.object.updateProjectionMatrix(),i=!0)}return this._scale=1,this._performCursorZoom=!1,i||this._lastPosition.distanceToSquared(this.object.position)>Ye||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Ye||this._lastTargetPosition.distanceToSquared(this.target)>Ye?(this.dispatchEvent(He),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e===null?Je/60/60*this.autoRotateSpeed:Je/60*this.autoRotateSpeed*e}_getZoomScale(e){let t=Math.abs(e*.01);return .95**(this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){w.setFromMatrixColumn(t,0),w.multiplyScalar(-e),this._panOffset.add(w)}_panUp(e,t){this.screenSpacePanning===!0?w.setFromMatrixColumn(t,1):(w.setFromMatrixColumn(t,0),w.crossVectors(this.object.up,w)),w.multiplyScalar(e),this._panOffset.add(w)}_pan(e,t){let n=this.domElement;if(this.object.isPerspectiveCamera){let r=this.object.position;w.copy(r).sub(this.target);let i=w.length();i*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*i/n.clientHeight,this.object.matrix),this._panUp(2*t*i/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.`),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.`),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.`),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),r=e-n.left,i=t-n.top,a=n.width,o=n.height;this._mouse.x=r/a*2-1,this._mouse.y=-(i/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Je*this._rotateDelta.x/t.clientHeight),this._rotateUp(Je*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(Je*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-Je*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(Je*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-Je*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateStart.set(n,r)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panStart.set(n,r)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,r=e.pageY-t.y,i=Math.sqrt(n*n+r*r);this._dollyStart.set(0,i)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateEnd.set(n,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Je*this._rotateDelta.x/t.clientHeight),this._rotateUp(Je*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panEnd.set(n,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,r=e.pageY-t.y,i=Math.sqrt(n*n+r*r);this._dollyEnd.set(0,i),this._dollyDelta.set(0,(this._dollyEnd.y/this._dollyStart.y)**+this.zoomSpeed),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new pe,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function Ze(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.ownerDocument.addEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.addEventListener(`pointerup`,this._onPointerUp)),!this._isTrackingPointer(e)&&(this._addPointer(e),e.pointerType===`touch`?this._onTouchStart(e):this._onMouseDown(e),this._cursorStyle===`grab`&&(this.domElement.style.cursor=`grabbing`)))}function Qe(e){this.enabled!==!1&&(e.pointerType===`touch`?this._onTouchMove(e):this._onMouseMove(e))}function $e(e){switch(this._removePointer(e),this._pointers.length){case 0:this.domElement.releasePointerCapture(e.pointerId),this.domElement.ownerDocument.removeEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.removeEventListener(`pointerup`,this._onPointerUp),this.dispatchEvent(We),this.state=T.NONE,this._cursorStyle===`grab`&&(this.domElement.style.cursor=`grab`);break;case 1:let t=this._pointers[0],n=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:n.x,pageY:n.y})}}function et(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case we.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(e),this.state=T.DOLLY;break;case we.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=T.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=T.ROTATE}break;case we.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=T.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=T.PAN}break;default:this.state=T.NONE}this.state!==T.NONE&&this.dispatchEvent(Ue)}function tt(e){switch(this.state){case T.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(e);break;case T.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(e);break;case T.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(e)}}function nt(e){this.enabled!==!1&&this.enableZoom!==!1&&this.state===T.NONE&&(e.preventDefault(),this.dispatchEvent(Ue),this._handleMouseWheel(this._customWheelEvent(e)),this.dispatchEvent(We))}function rt(e){this.enabled!==!1&&this._handleKeyDown(e)}function it(e){switch(this._trackPointer(e),this._pointers.length){case 1:switch(this.touches.ONE){case Oe.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(e),this.state=T.TOUCH_ROTATE;break;case Oe.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(e),this.state=T.TOUCH_PAN;break;default:this.state=T.NONE}break;case 2:switch(this.touches.TWO){case Oe.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(e),this.state=T.TOUCH_DOLLY_PAN;break;case Oe.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(e),this.state=T.TOUCH_DOLLY_ROTATE;break;default:this.state=T.NONE}break;default:this.state=T.NONE}this.state!==T.NONE&&this.dispatchEvent(Ue)}function at(e){switch(this._trackPointer(e),this.state){case T.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(e),this.update();break;case T.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(e),this.update();break;case T.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(e),this.update();break;case T.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(e),this.update();break;default:this.state=T.NONE}}function ot(e){this.enabled!==!1&&e.preventDefault()}function st(e){e.key===`Control`&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener(`keyup`,this._interceptControlUp,{passive:!0,capture:!0}))}function ct(e){e.key===`Control`&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener(`keyup`,this._interceptControlUp,{passive:!0,capture:!0}))}var lt=class extends ce{constructor(e){super(e)}load(e,t,n,r){let i=this,a=this.path===``?ve.extractUrlBase(e):this.path,o=new p(this.manager);o.setPath(this.path),o.setRequestHeader(this.requestHeader),o.setWithCredentials(this.withCredentials),o.load(e,function(n){try{t(i.parse(n,a))}catch(t){r?r(t):console.error(t),i.manager.itemError(e)}},n,r)}setMaterialOptions(e){return this.materialOptions=e,this}parse(e,t){let n=e.split(`
`),r={},i=/\s+/,a={};for(let e=0;e<n.length;e++){let t=n[e];if(t=t.trim(),t.length===0||t.charAt(0)===`#`)continue;let o=t.indexOf(` `),s=o>=0?t.substring(0,o):t;s=s.toLowerCase();let c=o>=0?t.substring(o+1):``;if(c=c.trim(),s===`newmtl`)r={name:c},a[c]=r;else if(s===`ka`||s===`kd`||s===`ks`||s===`ke`){let e=c.split(i,3);r[s]=[parseFloat(e[0]),parseFloat(e[1]),parseFloat(e[2])]}else r[s]=c}let o=new ut(this.resourcePath||t,this.materialOptions);return o.setCrossOrigin(this.crossOrigin),o.setManager(this.manager),o.setMaterials(a),o}},ut=class{constructor(e=``,t={}){this.baseUrl=e,this.options=t,this.materialsInfo={},this.materials={},this.materialsArray=[],this.nameLookup={},this.crossOrigin=`anonymous`,this.side=this.options.side===void 0?0:this.options.side,this.wrap=this.options.wrap===void 0?re:this.options.wrap}setCrossOrigin(e){return this.crossOrigin=e,this}setManager(e){this.manager=e}setMaterials(e){this.materialsInfo=this.convert(e),this.materials={},this.materialsArray=[],this.nameLookup={}}convert(e){if(!this.options)return e;let t={};for(let n in e){let r=e[n],i={};t[n]=i;for(let e in r){let t=!0,n=r[e],a=e.toLowerCase();switch(a){case`kd`:case`ka`:case`ks`:this.options&&this.options.normalizeRGB&&(n=[n[0]/255,n[1]/255,n[2]/255]),this.options&&this.options.ignoreZeroRGBs&&n[0]===0&&n[1]===0&&n[2]===0&&(t=!1)}t&&(i[a]=n)}}return t}preload(){for(let e in this.materialsInfo)this.create(e)}getIndex(e){return this.nameLookup[e]}getAsArray(){let e=0;for(let t in this.materialsInfo)this.materialsArray[e]=this.create(t),this.nameLookup[t]=e,e++;return this.materialsArray}create(e){return this.materials[e]===void 0&&this.createMaterial_(e),this.materials[e]}createMaterial_(e){let t=this,n=this.materialsInfo[e],r={name:e,side:this.side};function i(e,t){return typeof t!=`string`||t===``?``:/^https?:\/\//i.test(t)?t:e+t}function o(e,n){if(r[e])return;let a=t.getTextureParams(n,r),o=t.loadTexture(i(t.baseUrl,a.url));o.repeat.copy(a.scale),o.offset.copy(a.offset),o.wrapS=t.wrap,o.wrapT=t.wrap,(e===`map`||e===`emissiveMap`)&&(o.colorSpace=b),r[e]=o}for(let e in n){let t=n[e],i;if(t!==``)switch(e.toLowerCase()){case`kd`:r.color=Ie.colorSpaceToWorking(new Ne().fromArray(t),b);break;case`ks`:r.specular=Ie.colorSpaceToWorking(new Ne().fromArray(t),b);break;case`ke`:r.emissive=Ie.colorSpaceToWorking(new Ne().fromArray(t),b);break;case`map_kd`:o(`map`,t);break;case`map_ks`:o(`specularMap`,t);break;case`map_ke`:o(`emissiveMap`,t);break;case`norm`:o(`normalMap`,t);break;case`map_bump`:case`bump`:o(`bumpMap`,t);break;case`disp`:o(`displacementMap`,t);break;case`map_d`:o(`alphaMap`,t),r.transparent=!0;break;case`ns`:r.shininess=parseFloat(t);break;case`d`:i=parseFloat(t),i<1&&(r.opacity=i,r.transparent=!0);break;case`tr`:i=parseFloat(t),this.options&&this.options.invertTrProperty&&(i=1-i),i>0&&(r.opacity=1-i,r.transparent=!0)}}return this.materials[e]=new a(r),this.materials[e]}getTextureParams(e,t){let n={scale:new pe(1,1),offset:new pe(0,0)},r=e.split(/\s+/),i;return i=r.indexOf(`-bm`),i>=0&&(t.bumpScale=parseFloat(r[i+1]),r.splice(i,2)),i=r.indexOf(`-mm`),i>=0&&(t.displacementBias=parseFloat(r[i+1]),t.displacementScale=parseFloat(r[i+2]),r.splice(i,3)),i=r.indexOf(`-s`),i>=0&&(n.scale.set(parseFloat(r[i+1]),parseFloat(r[i+2])),r.splice(i,4)),i=r.indexOf(`-o`),i>=0&&(n.offset.set(parseFloat(r[i+1]),parseFloat(r[i+2])),r.splice(i,4)),n.url=r.join(` `).trim(),n}loadTexture(e,t,n,r,i){let a=this.manager===void 0?h:this.manager,o=a.getHandler(e);o===null&&(o=new _e(a)),o.setCrossOrigin&&o.setCrossOrigin(this.crossOrigin);let s=o.load(e,n,r,i);return t!==void 0&&(s.mapping=t),s}},dt=/^[og]\s*(.+)?/,ft=/^mtllib /,pt=/^usemtl /,mt=/^usemap /,ht=/\s+/,gt=new S,_t=new S,vt=new S,yt=new S,bt=new S,xt=new Ne;function St(){let e={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}let n=this.object&&typeof this.object.currentMaterial==`function`?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize==`function`&&this.object._finalize(!0),this.object={name:e||``,fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(e,t){let n=this._finalize(!1);n&&(n.inherited||n.groupCount<=0)&&this.materials.splice(n.index,1);let r={index:this.materials.length,name:e||``,mtllib:Array.isArray(t)&&t.length>0?t[t.length-1]:``,smooth:n===void 0?this.smooth:n.smooth,groupStart:n===void 0?0:n.groupEnd,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(e){let t={index:typeof e==`number`?e:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return t.clone=this.clone.bind(t),t}};return this.materials.push(r),r},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(e){let t=this.currentMaterial();if(t&&t.groupEnd===-1&&(t.groupEnd=this.geometry.vertices.length/3,t.groupCount=t.groupEnd-t.groupStart,t.inherited=!1),e&&this.materials.length>1)for(let e=this.materials.length-1;e>=0;e--)this.materials[e].groupCount<=0&&this.materials.splice(e,1);return e&&this.materials.length===0&&this.materials.push({name:``,smooth:this.smooth}),t}},n&&n.name&&typeof n.clone==`function`){let e=n.clone(0);e.inherited=!0,this.object.materials.push(e)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize==`function`&&this.object._finalize(!0)},parseVertexIndex:function(e,t){let n=parseInt(e,10);return(n>=0?n-1:n+t/3)*3},parseNormalIndex:function(e,t){let n=parseInt(e,10);return(n>=0?n-1:n+t/3)*3},parseUVIndex:function(e,t){let n=parseInt(e,10);return(n>=0?n-1:n+t/2)*2},addVertex:function(e,t,n){let r=this.vertices,i=this.object.geometry.vertices;i.push(r[e+0],r[e+1],r[e+2]),i.push(r[t+0],r[t+1],r[t+2]),i.push(r[n+0],r[n+1],r[n+2])},addVertexPoint:function(e){let t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){let t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,n){let r=this.normals,i=this.object.geometry.normals;i.push(r[e+0],r[e+1],r[e+2]),i.push(r[t+0],r[t+1],r[t+2]),i.push(r[n+0],r[n+1],r[n+2])},addFaceNormal:function(e,t,n){let r=this.vertices,i=this.object.geometry.normals;gt.fromArray(r,e),_t.fromArray(r,t),vt.fromArray(r,n),bt.subVectors(vt,_t),yt.subVectors(gt,_t),bt.cross(yt),bt.normalize(),i.push(bt.x,bt.y,bt.z),i.push(bt.x,bt.y,bt.z),i.push(bt.x,bt.y,bt.z)},addColor:function(e,t,n){let r=this.colors,i=this.object.geometry.colors;r[e]!==void 0&&i.push(r[e+0],r[e+1],r[e+2]),r[t]!==void 0&&i.push(r[t+0],r[t+1],r[t+2]),r[n]!==void 0&&i.push(r[n+0],r[n+1],r[n+2])},addUV:function(e,t,n){let r=this.uvs,i=this.object.geometry.uvs;i.push(r[e+0],r[e+1]),i.push(r[t+0],r[t+1]),i.push(r[n+0],r[n+1])},addDefaultUV:function(){let e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){let t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,n,r,i,a,o,s,c){let l=this.vertices.length,u=this.parseVertexIndex(e,l),d=this.parseVertexIndex(t,l),f=this.parseVertexIndex(n,l);if(this.addVertex(u,d,f),this.addColor(u,d,f),o!==void 0&&o!==``){let e=this.normals.length;u=this.parseNormalIndex(o,e),d=this.parseNormalIndex(s,e),f=this.parseNormalIndex(c,e),this.addNormal(u,d,f)}else this.addFaceNormal(u,d,f);if(r!==void 0&&r!==``){let e=this.uvs.length;u=this.parseUVIndex(r,e),d=this.parseUVIndex(i,e),f=this.parseUVIndex(a,e),this.addUV(u,d,f),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type=`Points`;let t=this.vertices.length;for(let n=0,r=e.length;n<r;n++){let r=this.parseVertexIndex(e[n],t);this.addVertexPoint(r),this.addColor(r)}},addLineGeometry:function(e,t){this.object.geometry.type=`Line`;let n=this.vertices.length,r=this.uvs.length;for(let t=0,r=e.length;t<r;t++)this.addVertexLine(this.parseVertexIndex(e[t],n));for(let e=0,n=t.length;e<n;e++)this.addUVLine(this.parseUVIndex(t[e],r))}};return e.startObject(``,!1),e}var Ct=class extends ce{constructor(e){super(e),this.materials=null}load(e,t,n,r){let i=this,a=new p(this.manager);a.setPath(this.path),a.setRequestHeader(this.requestHeader),a.setWithCredentials(this.withCredentials),a.load(e,function(n){try{t(i.parse(n))}catch(t){r?r(t):console.error(t),i.manager.itemError(e)}},n,r)}setMaterials(e){return this.materials=e,this}parse(e){let t=new St;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,``));let r=e.split(`
`),i=[];for(let e=0,n=r.length;e<n;e++){let n=r[e].trimStart();if(n.length===0)continue;let a=n.charAt(0);if(a!==`#`){if(a===`v`){let e=n.split(ht);switch(e[0]){case`v`:t.vertices.push(parseFloat(e[1]),parseFloat(e[2]),parseFloat(e[3])),e.length>=7?(xt.setRGB(parseFloat(e[4]),parseFloat(e[5]),parseFloat(e[6]),b),t.colors.push(xt.r,xt.g,xt.b)):t.colors.push(void 0,void 0,void 0);break;case`vn`:t.normals.push(parseFloat(e[1]),parseFloat(e[2]),parseFloat(e[3]));break;case`vt`:t.uvs.push(parseFloat(e[1]),parseFloat(e[2]))}}else if(a===`f`){let e=n.slice(1).trim().split(ht),r=[];for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.length>0){let e=n.split(`/`);r.push(e)}}let i=r[0];for(let e=1,n=r.length-1;e<n;e++){let n=r[e],a=r[e+1];t.addFace(i[0],n[0],a[0],i[1],n[1],a[1],i[2],n[2],a[2])}}else if(a===`l`){let e=n.substring(1).trim().split(` `),r=[],i=[];if(n.indexOf(`/`)===-1)r=e;else for(let t=0,n=e.length;t<n;t++){let n=e[t].split(`/`);n[0]!==``&&r.push(n[0]),n[1]!==``&&i.push(n[1])}t.addLineGeometry(r,i)}else if(a===`p`){let e=n.slice(1).trim().split(` `);t.addPointGeometry(e)}else if((i=dt.exec(n))!==null){let e=(` `+i[0].slice(1).trim()).slice(1);t.startObject(e)}else if(pt.test(n))t.object.startMaterial(n.substring(7).trim(),t.materialLibraries);else if(ft.test(n))t.materialLibraries.push(n.substring(7).trim());else if(mt.test(n))console.warn(`THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.`);else if(a===`s`){if(i=n.split(` `),i.length>1){let e=i[1].trim().toLowerCase();t.object.smooth=e!==`0`&&e!==`off`}else t.object.smooth=!0;let e=t.object.currentMaterial();e&&(e.smooth=t.object.smooth)}else{if(n===`\0`)continue;console.warn(`THREE.OBJLoader: Unexpected line: "`+n+`"`)}}}t.finalize();let o=new n;if(o.materialLibraries=[].concat(t.materialLibraries),t.objects.length!==1||t.objects[0].geometry.vertices.length!==0)for(let e=0,n=t.objects.length;e<n;e++){let n=t.objects[e],r=n.geometry,i=n.materials,s=r.type===`Line`,c=r.type===`Points`,l=!1;if(r.vertices.length===0)continue;let u=new ye;u.setAttribute(`position`,new g(r.vertices,3)),r.normals.length>0&&u.setAttribute(`normal`,new g(r.normals,3)),r.colors.length>0&&(l=!0,u.setAttribute(`color`,new g(r.colors,3))),r.hasUVIndices===!0&&u.setAttribute(`uv`,new g(r.uvs,2));let f=[];for(let e=0,n=i.length;e<n;e++){let n=i[e],r=n.name+`_`+n.smooth+`_`+l,o=t.materials[r];if(this.materials!==null){if(o=this.materials.create(n.name),s&&o&&!(o instanceof Ae)){let e=new Ae;be.prototype.copy.call(e,o),e.color.copy(o.color),o=e}else if(c&&o&&!(o instanceof y)){let e=new y({size:10,sizeAttenuation:!1});be.prototype.copy.call(e,o),e.color.copy(o.color),e.map=o.map,o=e}}o===void 0&&(o=s?new Ae:c?new y({size:1,sizeAttenuation:!1}):new a,o.name=n.name,o.flatShading=!n.smooth,o.vertexColors=l,t.materials[r]=o),f.push(o)}let p;if(f.length>1){for(let e=0,t=i.length;e<t;e++){let t=i[e];u.addGroup(t.groupStart,t.groupCount,e)}p=s?new Ee(u,f):c?new d(u,f):new Fe(u,f)}else p=s?new Ee(u,f[0]):c?new d(u,f[0]):new Fe(u,f[0]);p.name=n.name,o.add(p)}else if(t.vertices.length>0){let e=new y({size:1,sizeAttenuation:!1}),n=new ye;n.setAttribute(`position`,new g(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(n.setAttribute(`color`,new g(t.colors,3)),e.vertexColors=!0);let r=new d(n,e);o.add(r)}return o}},wt=Uint8Array,Tt=Uint16Array,Et=Int32Array,Dt=new wt([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),Ot=new wt([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),kt=new wt([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),At=function(e,t){for(var n=new Tt(31),r=0;r<31;++r)n[r]=t+=1<<e[r-1];for(var i=new Et(n[30]),r=1;r<30;++r)for(var a=n[r];a<n[r+1];++a)i[a]=a-n[r]<<5|r;return{b:n,r:i}},jt=At(Dt,2),Mt=jt.b,Nt=jt.r;Mt[28]=258,Nt[258]=28;var Pt=At(Ot,0),Ft=Pt.b;Pt.r;for(var It=new Tt(32768),E=0;E<32768;++E){var Lt=(E&43690)>>1|(E&21845)<<1;Lt=(Lt&52428)>>2|(Lt&13107)<<2,Lt=(Lt&61680)>>4|(Lt&3855)<<4,It[E]=((Lt&65280)>>8|(Lt&255)<<8)>>1}for(var Rt=(function(e,t,n){for(var r=e.length,i=0,a=new Tt(t);i<r;++i)e[i]&&++a[e[i]-1];var o=new Tt(t);for(i=1;i<t;++i)o[i]=o[i-1]+a[i-1]<<1;var s;if(n){s=new Tt(1<<t);var c=15-t;for(i=0;i<r;++i)if(e[i])for(var l=i<<4|e[i],u=t-e[i],d=o[e[i]-1]++<<u,f=d|(1<<u)-1;d<=f;++d)s[It[d]>>c]=l}else for(s=new Tt(r),i=0;i<r;++i)e[i]&&(s[i]=It[o[e[i]-1]++]>>15-e[i]);return s}),zt=new wt(288),E=0;E<144;++E)zt[E]=8;for(var E=144;E<256;++E)zt[E]=9;for(var E=256;E<280;++E)zt[E]=7;for(var E=280;E<288;++E)zt[E]=8;for(var Bt=new wt(32),E=0;E<32;++E)Bt[E]=5;var Vt=Rt(zt,9,1),Ht=Rt(Bt,5,1),Ut=function(e){for(var t=e[0],n=1;n<e.length;++n)e[n]>t&&(t=e[n]);return t},Wt=function(e,t,n){var r=t/8|0;return(e[r]|e[r+1]<<8)>>(t&7)&n},Gt=function(e,t){var n=t/8|0;return(e[n]|e[n+1]<<8|e[n+2]<<16)>>(t&7)},Kt=function(e){return(e+7)/8|0},qt=function(e,t,n){return(t==null||t<0)&&(t=0),(n==null||n>e.length)&&(n=e.length),new wt(e.subarray(t,n))},Jt=[`unexpected EOF`,`invalid block type`,`invalid length/literal`,`invalid distance`,`stream finished`,`no stream handler`,,`no callback`,`invalid UTF-8 data`,`extra field too long`,`date not in range 1980-2099`,`filename too long`,`stream finishing`,`invalid zip data`],Yt=function(e,t,n){var r=Error(t||Jt[e]);if(r.code=e,Error.captureStackTrace&&Error.captureStackTrace(r,Yt),!n)throw r;return r},Xt=function(e,t,n,r){var i=e.length,a=r?r.length:0;if(!i||t.f&&!t.l)return n||new wt(0);var o=!n,s=o||t.i!=2,c=t.i;o&&(n=new wt(i*3));var l=function(e){var t=n.length;if(e>t){var r=new wt(Math.max(t*2,e));r.set(n),n=r}},u=t.f||0,d=t.p||0,f=t.b||0,p=t.l,m=t.d,h=t.m,g=t.n,_=i*8;do{if(!p){u=Wt(e,d,1);var v=Wt(e,d+1,3);if(d+=3,!v){var y=Kt(d)+4,ee=e[y-4]|e[y-3]<<8,te=y+ee;if(te>i){c&&Yt(0);break}s&&l(f+ee),n.set(e.subarray(y,te),f),t.b=f+=ee,t.p=d=te*8,t.f=u;continue}if(v==1)p=Vt,m=Ht,h=9,g=5;else if(v==2){var ne=Wt(e,d,31)+257,re=Wt(e,d+10,15)+4,b=ne+Wt(e,d+5,31)+1;d+=14;for(var ie=new wt(b),ae=new wt(19),x=0;x<re;++x)ae[kt[x]]=Wt(e,d+x*3,7);d+=re*3;for(var oe=Ut(ae),se=(1<<oe)-1,ce=Rt(ae,oe,1),x=0;x<b;){var le=ce[Wt(e,d,se)];d+=le&15;var y=le>>4;if(y<16)ie[x++]=y;else{var ue=0,de=0;for(y==16?(de=3+Wt(e,d,3),d+=2,ue=ie[x-1]):y==17?(de=3+Wt(e,d,7),d+=3):y==18&&(de=11+Wt(e,d,127),d+=7);de--;)ie[x++]=ue}}var S=ie.subarray(0,ne),fe=ie.subarray(ne);h=Ut(S),g=Ut(fe),p=Rt(S,h,1),m=Rt(fe,g,1)}else Yt(1);if(d>_){c&&Yt(0);break}}s&&l(f+131072);for(var pe=(1<<h)-1,C=(1<<g)-1,me=d;;me=d){var ue=p[Gt(e,d)&pe],he=ue>>4;if(d+=ue&15,d>_){c&&Yt(0);break}if(ue||Yt(2),he<256)n[f++]=he;else if(he==256){me=d,p=null;break}else{var ge=he-254;if(he>264){var x=he-257,_e=Dt[x];ge=Wt(e,d,(1<<_e)-1)+Mt[x],d+=_e}var ve=m[Gt(e,d)&C],ye=ve>>4;ve||Yt(3),d+=ve&15;var fe=Ft[ye];if(ye>3){var _e=Ot[ye];fe+=Gt(e,d)&(1<<_e)-1,d+=_e}if(d>_){c&&Yt(0);break}s&&l(f+131072);var be=f+ge;if(f<fe){var xe=a-fe,Se=Math.min(fe,be);for(xe+f<0&&Yt(3);f<Se;++f)n[f]=r[xe+f]}for(;f<be;++f)n[f]=n[f-fe]}}t.l=p,t.p=me,t.b=f,t.f=u,p&&(u=1,t.m=h,t.d=m,t.n=g)}while(!u);return f!=n.length&&o?qt(n,0,f):n.subarray(0,f)},Zt=new wt(0),Qt=function(e,t){return((e[0]&15)!=8||e[0]>>4>7||(e[0]<<8|e[1])%31)&&Yt(6,`invalid zlib data`),(e[1]>>5&1)==+!t&&Yt(6,`invalid zlib data: `+(e[1]&32?`need`:`unexpected`)+` dictionary`),(e[1]>>3&4)+2};function $t(e,t){return Xt(e.subarray(Qt(e,t&&t.dictionary),-4),{i:2},t&&t.out,t&&t.dictionary)}var en=typeof TextDecoder<`u`&&new TextDecoder;try{en.decode(Zt,{stream:!0})}catch{}function tn(e,t,n){let r=n.length-e-1;if(t>=n[r])return r-1;if(t<=n[e])return e;let i=e,a=r,o=Math.floor((i+a)/2);for(;t<n[o]||t>=n[o+1];)t<n[o]?a=o:i=o,o=Math.floor((i+a)/2);return o}function nn(e,t,n,r){let i=[],a=[],o=[];i[0]=1;for(let s=1;s<=n;++s){a[s]=t-r[e+1-s],o[s]=r[e+s]-t;let n=0;for(let e=0;e<s;++e){let t=o[e+1],r=a[s-e],c=i[e]/(t+r);i[e]=n+t*c,n=r*c}i[s]=n}return i}function rn(e,t,n,r){let i=tn(e,r,t),a=nn(i,r,e,t),o=new ae(0,0,0,0);for(let t=0;t<=e;++t){let r=n[i-e+t],s=a[t],c=r.w*s;o.x+=r.x*c,o.y+=r.y*c,o.z+=r.z*c,o.w+=r.w*s}return o}function an(e,t,n,r,i){let a=[];for(let e=0;e<=n;++e)a[e]=0;let o=[];for(let e=0;e<=r;++e)o[e]=a.slice(0);let s=[];for(let e=0;e<=n;++e)s[e]=a.slice(0);s[0][0]=1;let c=a.slice(0),l=a.slice(0);for(let r=1;r<=n;++r){c[r]=t-i[e+1-r],l[r]=i[e+r]-t;let n=0;for(let e=0;e<r;++e){let t=l[e+1],i=c[r-e];s[r][e]=t+i;let a=s[e][r-1]/s[r][e];s[e][r]=n+t*a,n=i*a}s[r][r]=n}for(let e=0;e<=n;++e)o[0][e]=s[e][n];for(let e=0;e<=n;++e){let t=0,i=1,c=[];for(let e=0;e<=n;++e)c[e]=a.slice(0);c[0][0]=1;for(let a=1;a<=r;++a){let r=0,l=e-a,u=n-a;e>=a&&(c[i][0]=c[t][0]/s[u+1][l],r=c[i][0]*s[l][u]);let d=l>=-1?1:-l,f=e-1<=u?a-1:n-e;for(let e=d;e<=f;++e)c[i][e]=(c[t][e]-c[t][e-1])/s[u+1][l+e],r+=c[i][e]*s[l+e][u];e<=u&&(c[i][a]=-c[t][a-1]/s[u+1][e],r+=c[i][a]*s[e][u]),o[a][e]=r;let p=t;t=i,i=p}}let u=n;for(let e=1;e<=r;++e){for(let t=0;t<=n;++t)o[e][t]*=u;u*=n-e}return o}function on(e,t,n,r,i){let a=i<e?i:e,o=[],s=tn(e,r,t),c=an(s,r,e,a,t),l=[];for(let e=0;e<n.length;++e){let t=n[e].clone(),r=t.w;t.x*=r,t.y*=r,t.z*=r,l[e]=t}for(let t=0;t<=a;++t){let n=l[s-e].clone().multiplyScalar(c[t][0]);for(let r=1;r<=e;++r)n.add(l[s-e+r].clone().multiplyScalar(c[t][r]));o[t]=n}for(let e=a+1;e<=i+1;++e)o[e]=new ae(0,0,0);return o}function sn(e,t){let n=1;for(let t=2;t<=e;++t)n*=t;let r=1;for(let e=2;e<=t;++e)r*=e;for(let n=2;n<=e-t;++n)r*=n;return n/r}function cn(e){let t=e.length,n=[],r=[];for(let i=0;i<t;++i){let t=e[i];n[i]=new S(t.x,t.y,t.z),r[i]=t.w}let i=[];for(let e=0;e<t;++e){let t=n[e].clone();for(let n=1;n<=e;++n)t.sub(i[e-n].clone().multiplyScalar(sn(e,n)*r[n]));i[e]=t.divideScalar(r[0])}return i}function ln(e,t,n,r,i){return cn(on(e,t,n,r,i))}var un=class extends i{constructor(e,t,n,r,i){super();let a=t?t.length-1:0,o=n?n.length:0;this.degree=e,this.knots=t,this.controlPoints=[],this.startKnot=r||0,this.endKnot=i||a;for(let e=0;e<o;++e){let t=n[e];this.controlPoints[e]=new ae(t.x,t.y,t.z,t.w)}}getPoint(e,t=new S){let n=t,r=this.knots[this.startKnot]+e*(this.knots[this.endKnot]-this.knots[this.startKnot]),i=rn(this.degree,this.knots,this.controlPoints,r);return i.w!==1&&i.divideScalar(i.w),n.set(i.x,i.y,i.z)}getTangent(e,t=new S){let n=t,r=this.knots[0]+e*(this.knots[this.knots.length-1]-this.knots[0]),i=ln(this.degree,this.knots,this.controlPoints,r,1);return n.copy(i[1]).normalize(),n}toJSON(){let e=super.toJSON();return e.degree=this.degree,e.knots=[...this.knots],e.controlPoints=this.controlPoints.map(e=>e.toArray()),e.startKnot=this.startKnot,e.endKnot=this.endKnot,e}fromJSON(e){return super.fromJSON(e),this.degree=e.degree,this.knots=[...e.knots],this.controlPoints=e.controlPoints.map(e=>new ae(e[0],e[1],e[2],e[3])),this.startKnot=e.startKnot,this.endKnot=e.endKnot,this}},D,O,k,dn=class extends ce{constructor(e){super(e),this.trimAnimationClips=!1}load(e,t,n,r){let i=this,a=i.path===``?ve.extractUrlBase(e):i.path,o=new p(this.manager);o.setPath(i.path),o.setResponseType(`arraybuffer`),o.setRequestHeader(i.requestHeader),o.setWithCredentials(i.withCredentials),o.load(e,function(n){try{t(i.parse(n,a))}catch(t){r?r(t):console.error(t),i.manager.itemError(e)}},n,r)}parse(e,t){if(yn(e))D=new gn().parse(e);else{let t=An(e);if(!bn(t))throw Error(`THREE.FBXLoader: Unknown format.`);if(xn(t)<7e3)throw Error(`THREE.FBXLoader: FBX version not supported, FileVersion: `+xn(t));D=new hn().parse(t)}return new fn(new _e(this.manager).setPath(this.resourcePath||t).setCrossOrigin(this.crossOrigin),this.manager,this.trimAnimationClips).parse(D)}},fn=class{constructor(e,t,n){this.textureLoader=e,this.manager=t,this.trimAnimationClips=n}parse(){O=this.parseConnections();let e=this.parseImages(),t=this.parseTextures(e),n=this.parseMaterials(t),r=this.parseDeformers(),i=new pn().parse(r);return this.parseScene(r,i,n),k}parseConnections(){let e=new Map;return`Connections`in D&&D.Connections.connections.forEach(function(t){let n=t[0],r=t[1],i=t[2];e.has(n)||e.set(n,{parents:[],children:[]});let a={ID:r,relationship:i};e.get(n).parents.push(a),e.has(r)||e.set(r,{parents:[],children:[]});let o={ID:n,relationship:i};e.get(r).children.push(o)}),e}parseImages(){let e={},t={};if(`Video`in D.Objects){let n=D.Objects.Video;for(let r in n){let i=n[r],a=parseInt(r);if(e[a]=i.RelativeFilename||i.Filename,`Content`in i){let e=i.Content instanceof ArrayBuffer&&i.Content.byteLength>0,a=typeof i.Content==`string`&&i.Content!==``;if(e||a){let e=this.parseImage(n[r]);t[i.RelativeFilename||i.Filename]=e}}}}for(let n in e){let r=e[n];e[n]=t[r]===void 0?e[n].split(`\\`).pop():t[r]}return e}parseImage(e){let t=e.Content,n=e.RelativeFilename||e.Filename,r=n.slice(n.lastIndexOf(`.`)+1).toLowerCase(),i;switch(r){case`bmp`:i=`image/bmp`;break;case`jpg`:case`jpeg`:i=`image/jpeg`;break;case`png`:i=`image/png`;break;case`tif`:i=`image/tiff`;break;case`tga`:this.manager.getHandler(`.tga`)===null&&console.warn(`FBXLoader: TGA loader not found, skipping `,n),i=`image/tga`;break;case`webp`:i=`image/webp`;break;default:console.warn(`FBXLoader: Image type "`+r+`" is not supported.`);return}if(typeof t==`string`)return`data:`+i+`;base64,`+t;{let e=new Uint8Array(t);return URL.createObjectURL(new Blob([e],{type:i}))}}parseTextures(e){let t=new Map;if(`Texture`in D.Objects){let n=D.Objects.Texture;for(let r in n){let i=this.parseTexture(n[r],e);t.set(parseInt(r),i)}}return t}parseTexture(e,t){let n=this.loadTexture(e,t);n.ID=e.id,n.name=e.attrName;let r=e.WrapModeU,i=e.WrapModeV,a=r===void 0?0:r.value,o=i===void 0?0:i.value;if(n.wrapS=a===0?re:ie,n.wrapT=o===0?re:ie,`Scaling`in e){let t=e.Scaling.value;n.repeat.x=t[0],n.repeat.y=t[1]}if(`Translation`in e){let t=e.Translation.value;n.offset.x=t[0],n.offset.y=t[1]}return n}loadTexture(e,t){let n=e.FileName.split(`.`).pop().toLowerCase(),r=this.manager.getHandler(`.${n}`);r===null&&(r=this.textureLoader);let i=r.path;i||r.setPath(this.textureLoader.path);let a=O.get(e.id).children,o;if(a!==void 0&&a.length>0&&t[a[0].ID]!==void 0&&(o=t[a[0].ID],(o.indexOf(`blob:`)===0||o.indexOf(`data:`)===0)&&r.setPath(void 0)),o===void 0)return console.warn(`FBXLoader: Undefined filename, creating placeholder texture.`),new se;let s=r.load(o);return r.setPath(i),s}parseMaterials(e){let t=new Map;if(`Material`in D.Objects){let n=D.Objects.Material;for(let r in n){let i=this.parseMaterial(n[r],e);i!==null&&t.set(parseInt(r),i)}}return t}parseMaterial(e,t){let n=e.id,r=e.attrName,i=e.ShadingModel;if(typeof i==`object`&&(i=i.value),!O.has(n))return null;let o=this.parseParameters(e,t,n),s;switch(i.toLowerCase()){case`phong`:s=new a;break;case`lambert`:s=new te;break;default:console.warn(`THREE.FBXLoader: unknown material type "%s". Defaulting to MeshPhongMaterial.`,i),s=new a}return s.setValues(o),s.name=r,s}parseParameters(e,t,n){let r={};e.BumpFactor&&(r.bumpScale=e.BumpFactor.value),e.Diffuse?r.color=Ie.colorSpaceToWorking(new Ne().fromArray(e.Diffuse.value),b):e.DiffuseColor&&(e.DiffuseColor.type===`Color`||e.DiffuseColor.type===`ColorRGB`)&&(r.color=Ie.colorSpaceToWorking(new Ne().fromArray(e.DiffuseColor.value),b)),e.DisplacementFactor&&(r.displacementScale=e.DisplacementFactor.value),e.Emissive?r.emissive=Ie.colorSpaceToWorking(new Ne().fromArray(e.Emissive.value),b):e.EmissiveColor&&(e.EmissiveColor.type===`Color`||e.EmissiveColor.type===`ColorRGB`)&&(r.emissive=Ie.colorSpaceToWorking(new Ne().fromArray(e.EmissiveColor.value),b)),e.EmissiveFactor&&(r.emissiveIntensity=parseFloat(e.EmissiveFactor.value)),r.opacity=1-(e.TransparencyFactor?parseFloat(e.TransparencyFactor.value):0),(r.opacity===1||r.opacity===0)&&(r.opacity=e.Opacity?parseFloat(e.Opacity.value):null,r.opacity===null&&(r.opacity=1)),r.opacity<1&&(r.transparent=!0),e.ReflectionFactor&&(r.reflectivity=e.ReflectionFactor.value),e.Shininess&&(r.shininess=e.Shininess.value),e.Specular?r.specular=Ie.colorSpaceToWorking(new Ne().fromArray(e.Specular.value),b):e.SpecularColor&&e.SpecularColor.type===`Color`&&(r.specular=Ie.colorSpaceToWorking(new Ne().fromArray(e.SpecularColor.value),b));let i=this;return O.get(n).children.forEach(function(e){let n=e.relationship;switch(n){case`Bump`:r.bumpMap=i.getTexture(t,e.ID);break;case`Maya|TEX_ao_map`:r.aoMap=i.getTexture(t,e.ID);break;case`DiffuseColor`:case`Maya|TEX_color_map`:r.map=i.getTexture(t,e.ID),r.map!==void 0&&(r.map.colorSpace=b);break;case`DisplacementColor`:r.displacementMap=i.getTexture(t,e.ID);break;case`EmissiveColor`:r.emissiveMap=i.getTexture(t,e.ID),r.emissiveMap!==void 0&&(r.emissiveMap.colorSpace=b);break;case`NormalMap`:case`Maya|TEX_normal_map`:r.normalMap=i.getTexture(t,e.ID);break;case`ReflectionColor`:r.envMap=i.getTexture(t,e.ID),r.envMap!==void 0&&(r.envMap.mapping=303,r.envMap.colorSpace=b);break;case`SpecularColor`:r.specularMap=i.getTexture(t,e.ID),r.specularMap!==void 0&&(r.specularMap.colorSpace=b);break;case`TransparentColor`:case`TransparencyFactor`:r.alphaMap=i.getTexture(t,e.ID),r.transparent=!0;break;default:console.warn(`THREE.FBXLoader: %s map is not supported in three.js, skipping texture.`,n)}}),r}getTexture(e,t){return`LayeredTexture`in D.Objects&&t in D.Objects.LayeredTexture&&(console.warn(`THREE.FBXLoader: layered textures are not supported in three.js. Discarding all but first layer.`),t=O.get(t).children[0].ID),e.get(t)}parseDeformers(){let e={},t={};if(`Deformer`in D.Objects){let n=D.Objects.Deformer;for(let r in n){let i=n[r],a=O.get(parseInt(r));if(i.attrType===`Skin`){let t=this.parseSkeleton(a,n);t.ID=r,a.parents.length>1&&console.warn(`THREE.FBXLoader: skeleton attached to more than one geometry is not supported.`),t.geometryID=a.parents[0].ID,e[r]=t}else if(i.attrType===`BlendShape`){let e={id:r};e.rawTargets=this.parseMorphTargets(a,n),e.id=r,a.parents.length>1&&console.warn(`THREE.FBXLoader: morph target attached to more than one geometry is not supported.`),t[r]=e}}}return{skeletons:e,morphTargets:t}}parseSkeleton(e,t){let n=[];return e.children.forEach(function(e){let r=t[e.ID];if(r.attrType!==`Cluster`)return;let i={ID:e.ID,indices:[],weights:[],transformLink:new x().fromArray(r.TransformLink.a)};`Indexes`in r&&(i.indices=r.Indexes.a,i.weights=r.Weights.a),n.push(i)}),{rawBones:n,bones:[]}}parseMorphTargets(e,t){let n=[];for(let r=0;r<e.children.length;r++){let i=e.children[r],a=t[i.ID],o={name:a.attrName,initialWeight:a.DeformPercent,id:a.id,fullWeights:a.FullWeights.a};if(a.attrType!==`BlendShapeChannel`)return;o.geoID=O.get(parseInt(i.ID)).children.filter(function(e){return e.relationship===void 0})[0].ID,n.push(o)}return n}parseScene(e,t,r){k=new n;let i=this.parseModels(e.skeletons,t,r),a=D.Objects.Model,o=this;i.forEach(function(e){let t=a[e.ID];o.setLookAtProperties(e,t),O.get(e.ID).parents.forEach(function(t){let n=i.get(t.ID);n!==void 0&&n.add(e)}),e.parent===null&&k.add(e)}),this.addGlobalSceneSettings(),k.traverse(function(e){if(e.userData.transformData){e.parent&&(e.userData.transformData.parentMatrix=e.parent.matrix,e.userData.transformData.parentMatrixWorld=e.parent.matrixWorld);let t=Dn(e.userData.transformData);e.applyMatrix4(t),e.updateWorldMatrix()}});let s=this.parsePoseNodes(),c=new Set;for(let t in e.skeletons)e.skeletons[t].rawBones.forEach(function(n,r){let i=e.skeletons[t].bones[r];i&&c.add(i.ID)});let l=new x;k.traverse(function(e){if(e.isBone&&e.ID!==void 0&&!c.has(e.ID)){let t=s[e.ID];t!==void 0&&(e.parent?(l.copy(e.parent.matrixWorld).invert(),l.multiply(t)):l.copy(t),l.decompose(e.position,e.quaternion,e.scale),e.updateMatrix(),e.matrixWorld.copy(t))}}),this.bindSkeleton(e.skeletons,t,i);let u=new mn(this.trimAnimationClips).parse();k.children.length===1&&k.children[0].isGroup&&(k.children[0].animations=u,Object.assign(k.children[0].userData,k.userData),k=k.children[0]),k.animations=u,`GlobalSettings`in D&&`UpAxis`in D.GlobalSettings&&D.GlobalSettings.UpAxis.value===2&&(console.warn(`THREE.FBXLoader: You are loading an asset with a Z-UP coordinate system. The loader just rotates the asset to transform it into Y-UP. The vertex data are not converted.`),k.rotation.set(-Math.PI/2,0,0))}parseModels(e,t,r){let i=new Map,a=D.Objects.Model;for(let o in a){let s=parseInt(o),c=a[o],l=O.get(s),u=this.buildSkeleton(l,e,s,c.attrName);if(!u){switch(c.attrType){case`Camera`:u=this.createCamera(l);break;case`Light`:u=this.createLight(l);break;case`Mesh`:u=this.createMesh(l,t,r);break;case`NurbsCurve`:u=this.createCurve(l,t);break;case`LimbNode`:case`Root`:u=new ge;break;default:u=new n}u.name=c.attrName?ze.sanitizeNodeName(c.attrName):``,u.userData.originalName=c.attrName,u.ID=s}this.getTransformData(u,c),i.set(s,u)}return i}buildSkeleton(e,t,n,r){let i=null;return e.parents.forEach(function(e){for(let a in t){let o=t[a];o.rawBones.forEach(function(t,a){if(t.ID===e.ID){let e=i;i=new ge,i.matrixWorld.copy(t.transformLink),i.name=r?ze.sanitizeNodeName(r):``,i.userData.originalName=r,i.ID=n,o.bones[a]=i,e!==null&&i.add(e)}})}}),i}createCamera(e){let t,n;if(e.children.forEach(function(e){let t=D.Objects.NodeAttribute[e.ID];t!==void 0&&(n=t)}),n===void 0)t=new he;else{let e=0;n.CameraProjectionType!==void 0&&n.CameraProjectionType.value===1&&(e=1);let r=1;n.NearPlane!==void 0&&(r=n.NearPlane.value/1e3);let i=1e3;n.FarPlane!==void 0&&(i=n.FarPlane.value/1e3);let a=window.innerWidth,o=window.innerHeight;n.AspectWidth!==void 0&&n.AspectHeight!==void 0&&(a=n.AspectWidth.value,o=n.AspectHeight.value);let s=a/o,c=45;n.FieldOfView!==void 0&&(c=n.FieldOfView.value);let l=n.FocalLength?n.FocalLength.value:null;switch(e){case 0:t=new m(c,s,r,i),l!==null&&t.setFocalLength(l);break;case 1:console.warn(`THREE.FBXLoader: Orthographic cameras not supported yet.`),t=new he;break;default:console.warn(`THREE.FBXLoader: Unknown camera type `+e+`.`),t=new he}}return t}createLight(t){let n,r;if(t.children.forEach(function(e){let t=D.Objects.NodeAttribute[e.ID];t!==void 0&&(r=t)}),r===void 0)n=new he;else{let t;t=r.LightType===void 0?0:r.LightType.value;let i=16777215;r.Color!==void 0&&(i=Ie.colorSpaceToWorking(new Ne().fromArray(r.Color.value),b));let a=r.Intensity===void 0?1:r.Intensity.value/100;r.CastLightOnObject!==void 0&&r.CastLightOnObject.value===0&&(a=0);let o=0;switch(r.FarAttenuationEnd!==void 0&&(o=r.EnableFarAttenuation!==void 0&&r.EnableFarAttenuation.value===0?0:r.FarAttenuationEnd.value),t){case 0:n=new l(i,a,o,1);break;case 1:n=new e(i,a);break;case 2:let t=Math.PI/3,s=0;r.OuterAngle===void 0?r.InnerAngle!==void 0&&(t=C.degToRad(r.InnerAngle.value)):(t=C.degToRad(r.OuterAngle.value),r.InnerAngle!==void 0&&(s=1-r.InnerAngle.value/r.OuterAngle.value,s=Math.max(0,s))),n=new Ce(i,a,o,t,s,1);break;default:console.warn(`THREE.FBXLoader: Unknown light type `+r.LightType.value+`, defaulting to a PointLight.`),n=new l(i,a)}r.CastShadows!==void 0&&r.CastShadows.value===1&&(n.castShadow=!0)}return n}createMesh(e,t,n){let r,i=null,o=null,s=[];if(e.children.forEach(function(e){t.has(e.ID)&&(i=t.get(e.ID)),n.has(e.ID)&&s.push(n.get(e.ID))}),s.length>1?o=s:s.length>0?o=s[0]:(o=new a({name:ce.DEFAULT_MATERIAL_NAME,color:13421772}),s.push(o)),`color`in i.attributes&&s.forEach(function(e){e.vertexColors=!0}),i.groups.length>0){let e=!1;for(let t=0,n=i.groups.length;t<n;t++){let n=i.groups[t];(n.materialIndex<0||n.materialIndex>=s.length)&&(n.materialIndex=s.length,e=!0)}if(e){let e=new a;s.push(e)}}return i.FBX_Deformer?(r=new xe(i,o),r.normalizeSkinWeights()):r=new Fe(i,o),r}createCurve(e,t){let n=e.children.reduce(function(e,n){return t.has(n.ID)&&(e=t.get(n.ID)),e},null),r=new Ae({name:ce.DEFAULT_MATERIAL_NAME,color:3342591,linewidth:1});return new de(n,r)}getTransformData(e,t){let n={};`InheritType`in t&&(n.inheritType=parseInt(t.InheritType.value)),n.eulerOrder=`RotationOrder`in t?On(t.RotationOrder.value):On(0),`Lcl_Translation`in t&&(n.translation=t.Lcl_Translation.value),`PreRotation`in t&&(n.preRotation=t.PreRotation.value),`Lcl_Rotation`in t&&(n.rotation=t.Lcl_Rotation.value),`PostRotation`in t&&(n.postRotation=t.PostRotation.value),`Lcl_Scaling`in t&&(n.scale=t.Lcl_Scaling.value),`ScalingOffset`in t&&(n.scalingOffset=t.ScalingOffset.value),`ScalingPivot`in t&&(n.scalingPivot=t.ScalingPivot.value),`RotationOffset`in t&&(n.rotationOffset=t.RotationOffset.value),`RotationPivot`in t&&(n.rotationPivot=t.RotationPivot.value),e.userData.transformData=n}setLookAtProperties(e,t){`LookAtProperty`in t&&O.get(e.ID).children.forEach(function(t){if(t.relationship===`LookAtProperty`){let n=D.Objects.Model[t.ID];if(`Lcl_Translation`in n){let t=n.Lcl_Translation.value;e.target===void 0?e.lookAt(new S().fromArray(t)):(e.target.position.fromArray(t),k.add(e.target))}}})}bindSkeleton(e,t,n){for(let r in e){let i=e[r],a=[];for(let e=0,t=i.bones.length;e<t;e++){let t=new x;i.bones[e]&&i.rawBones[e]&&t.copy(i.rawBones[e].transformLink).invert(),a.push(t)}O.get(parseInt(i.ID)).parents.forEach(function(e){if(t.has(e.ID)){let t=e.ID;O.get(t).parents.forEach(function(e){if(n.has(e.ID)){let t=n.get(e.ID);t.updateMatrixWorld(!0),t.bind(new ke(i.bones,a),t.matrixWorld)}})}})}}parsePoseNodes(){let e={};if(`Pose`in D.Objects){let t=D.Objects.Pose;for(let n in t)if(t[n].attrType===`BindPose`&&t[n].NbPoseNodes>0){let r=t[n].PoseNode;Array.isArray(r)?r.forEach(function(t){e[t.Node]=new x().fromArray(t.Matrix.a)}):e[r.Node]=new x().fromArray(r.Matrix.a)}}return e}addGlobalSceneSettings(){if(`GlobalSettings`in D){if(`AmbientColor`in D.GlobalSettings){let e=D.GlobalSettings.AmbientColor.value,t=e[0],n=e[1],r=e[2];if(t!==0||n!==0||r!==0){let e=new Ne().setRGB(t,n,r,b);k.add(new Se(e,1))}}`UnitScaleFactor`in D.GlobalSettings&&(k.userData.unitScaleFactor=D.GlobalSettings.UnitScaleFactor.value)}}},pn=class{constructor(){this.negativeMaterialIndices=!1}parse(e){let t=new Map;if(`Geometry`in D.Objects){let n=D.Objects.Geometry;for(let r in n){let i=O.get(parseInt(r)),a=this.parseGeometry(i,n[r],e);t.set(parseInt(r),a)}}return this.negativeMaterialIndices===!0&&console.warn(`THREE.FBXLoader: The FBX file contains invalid (negative) material indices. The asset might not render as expected.`),t}parseGeometry(e,t,n){switch(t.attrType){case`Mesh`:return this.parseMeshGeometry(e,t,n);case`NurbsCurve`:return this.parseNurbsGeometry(t)}}parseMeshGeometry(e,t,n){let r=n.skeletons,i=[],a=e.parents.map(function(e){return D.Objects.Model[e.ID]});if(a.length===0)return;let o=e.children.reduce(function(e,t){return r[t.ID]!==void 0&&(e=r[t.ID]),e},null);e.children.forEach(function(e){n.morphTargets[e.ID]!==void 0&&i.push(n.morphTargets[e.ID])});let s=a[0],c={};`RotationOrder`in s&&(c.eulerOrder=On(s.RotationOrder.value)),`InheritType`in s&&(c.inheritType=parseInt(s.InheritType.value)),`GeometricTranslation`in s&&(c.translation=s.GeometricTranslation.value),`GeometricRotation`in s&&(c.rotation=s.GeometricRotation.value),`GeometricScaling`in s&&(c.scale=s.GeometricScaling.value);let l=Dn(c);return this.genGeometry(t,o,i,l)}genGeometry(e,t,n,r){let i=new ye;e.attrName&&(i.name=e.attrName);let a=this.parseGeoNode(e,t),o=this.genBuffers(a),s=new g(o.vertex,3);if(s.applyMatrix4(r),i.setAttribute(`position`,s),o.colors.length>0&&i.setAttribute(`color`,new g(o.colors,3)),t&&(i.setAttribute(`skinIndex`,new je(o.weightsIndices,4)),i.setAttribute(`skinWeight`,new g(o.vertexWeights,4)),i.FBX_Deformer=t),o.normal.length>0){let e=new fe().getNormalMatrix(r),t=new g(o.normal,3);t.applyNormalMatrix(e),i.setAttribute(`normal`,t)}if(o.uvs.forEach(function(e,t){let n=t===0?`uv`:`uv${t}`;i.setAttribute(n,new g(o.uvs[t],2))}),a.material&&a.material.mappingType!==`AllSame`){let e=o.materialIndex[0],t=0;if(o.materialIndex.forEach(function(n,r){n!==e&&(i.addGroup(t,r-t,e),e=n,t=r)}),i.groups.length>0){let t=i.groups[i.groups.length-1],n=t.start+t.count;n!==o.materialIndex.length&&i.addGroup(n,o.materialIndex.length-n,e)}i.groups.length===0&&i.addGroup(0,o.materialIndex.length,o.materialIndex[0])}return this.addMorphTargets(i,e,n,r),i}parseGeoNode(e,t){let n={};if(n.vertexPositions=e.Vertices===void 0?[]:e.Vertices.a,n.vertexIndices=e.PolygonVertexIndex===void 0?[]:e.PolygonVertexIndex.a,e.LayerElementColor&&e.LayerElementColor[0].Colors&&(n.color=this.parseVertexColors(e.LayerElementColor[0])),e.LayerElementMaterial&&(n.material=this.parseMaterialIndices(e.LayerElementMaterial[0])),e.LayerElementNormal&&(n.normal=this.parseNormals(e.LayerElementNormal[0])),e.LayerElementUV){n.uv=[];let t=0;for(;e.LayerElementUV[t];)e.LayerElementUV[t].UV&&n.uv.push(this.parseUVs(e.LayerElementUV[t])),t++}return n.weightTable={},t!==null&&(n.skeleton=t,t.rawBones.forEach(function(e,t){e.indices.forEach(function(r,i){n.weightTable[r]===void 0&&(n.weightTable[r]=[]),n.weightTable[r].push({id:t,weight:e.weights[i]})})})),n}genBuffers(e){let t={vertex:[],normal:[],colors:[],uvs:[],materialIndex:[],vertexWeights:[],weightsIndices:[]},n=0,r=0,i=!1,a=[],o=[],s=[],c=[],l=[],u=[],d=this;return e.vertexIndices.forEach(function(f,p){let m,h=!1;f<0&&(f^=-1,h=!0);let g=[],_=[];if(a.push(f*3,f*3+1,f*3+2),e.color){let t=wn(p,n,f,e.color);s.push(t[0],t[1],t[2])}if(e.skeleton){if(e.weightTable[f]!==void 0&&e.weightTable[f].forEach(function(e){_.push(e.weight),g.push(e.id)}),_.length>4){i||=(console.warn(`THREE.FBXLoader: Vertex has more than 4 skinning weights assigned to vertex. Deleting additional weights.`),!0);let e=[0,0,0,0],t=[0,0,0,0];_.forEach(function(n,r){let i=n,a=g[r];t.forEach(function(t,n,r){if(i>t){r[n]=i,i=t;let o=e[n];e[n]=a,a=o}})}),g=e,_=t}for(;_.length<4;)_.push(0),g.push(0);for(let e=0;e<4;++e)l.push(_[e]),u.push(g[e])}if(e.normal){let t=wn(p,n,f,e.normal);o.push(t[0],t[1],t[2])}e.material&&e.material.mappingType!==`AllSame`&&(m=wn(p,n,f,e.material)[0],m<0&&(d.negativeMaterialIndices=!0,m=0)),e.uv&&e.uv.forEach(function(e,t){let r=wn(p,n,f,e);c[t]===void 0&&(c[t]=[]),c[t].push(r[0]),c[t].push(r[1])}),r++,h&&(d.genFace(t,e,a,m,o,s,c,l,u,r),n++,r=0,a=[],o=[],s=[],c=[],l=[],u=[])}),t}getNormalNewell(e){let t=new S(0,0,0);for(let n=0;n<e.length;n++){let r=e[n],i=e[(n+1)%e.length];t.x+=(r.y-i.y)*(r.z+i.z),t.y+=(r.z-i.z)*(r.x+i.x),t.z+=(r.x-i.x)*(r.y+i.y)}return t.normalize(),t}getNormalTangentAndBitangent(e){let t=this.getNormalNewell(e),n=(Math.abs(t.z)>.5?new S(0,1,0):new S(0,0,1)).cross(t).normalize();return{normal:t,tangent:n,bitangent:t.clone().cross(n).normalize()}}flattenVertex(e,t,n){return new pe(e.dot(t),e.dot(n))}genFace(e,t,n,r,i,a,o,s,c,l){let u;if(l>3){let e=[],r=t.baseVertexPositions||t.vertexPositions;for(let t=0;t<n.length;t+=3)e.push(new S(r[n[t]],r[n[t+1]],r[n[t+2]]));let{tangent:i,bitangent:a}=this.getNormalTangentAndBitangent(e),o=[];for(let t of e)o.push(this.flattenVertex(t,i,a));u=ue.triangulateShape(o,[])}else u=[[0,1,2]];for(let[l,d,f]of u)e.vertex.push(t.vertexPositions[n[l*3]]),e.vertex.push(t.vertexPositions[n[l*3+1]]),e.vertex.push(t.vertexPositions[n[l*3+2]]),e.vertex.push(t.vertexPositions[n[d*3]]),e.vertex.push(t.vertexPositions[n[d*3+1]]),e.vertex.push(t.vertexPositions[n[d*3+2]]),e.vertex.push(t.vertexPositions[n[f*3]]),e.vertex.push(t.vertexPositions[n[f*3+1]]),e.vertex.push(t.vertexPositions[n[f*3+2]]),t.skeleton&&(e.vertexWeights.push(s[l*4]),e.vertexWeights.push(s[l*4+1]),e.vertexWeights.push(s[l*4+2]),e.vertexWeights.push(s[l*4+3]),e.vertexWeights.push(s[d*4]),e.vertexWeights.push(s[d*4+1]),e.vertexWeights.push(s[d*4+2]),e.vertexWeights.push(s[d*4+3]),e.vertexWeights.push(s[f*4]),e.vertexWeights.push(s[f*4+1]),e.vertexWeights.push(s[f*4+2]),e.vertexWeights.push(s[f*4+3]),e.weightsIndices.push(c[l*4]),e.weightsIndices.push(c[l*4+1]),e.weightsIndices.push(c[l*4+2]),e.weightsIndices.push(c[l*4+3]),e.weightsIndices.push(c[d*4]),e.weightsIndices.push(c[d*4+1]),e.weightsIndices.push(c[d*4+2]),e.weightsIndices.push(c[d*4+3]),e.weightsIndices.push(c[f*4]),e.weightsIndices.push(c[f*4+1]),e.weightsIndices.push(c[f*4+2]),e.weightsIndices.push(c[f*4+3])),t.color&&(e.colors.push(a[l*3]),e.colors.push(a[l*3+1]),e.colors.push(a[l*3+2]),e.colors.push(a[d*3]),e.colors.push(a[d*3+1]),e.colors.push(a[d*3+2]),e.colors.push(a[f*3]),e.colors.push(a[f*3+1]),e.colors.push(a[f*3+2])),t.material&&t.material.mappingType!==`AllSame`&&(e.materialIndex.push(r),e.materialIndex.push(r),e.materialIndex.push(r)),t.normal&&(e.normal.push(i[l*3]),e.normal.push(i[l*3+1]),e.normal.push(i[l*3+2]),e.normal.push(i[d*3]),e.normal.push(i[d*3+1]),e.normal.push(i[d*3+2]),e.normal.push(i[f*3]),e.normal.push(i[f*3+1]),e.normal.push(i[f*3+2])),t.uv&&t.uv.forEach(function(t,n){e.uvs[n]===void 0&&(e.uvs[n]=[]),e.uvs[n].push(o[n][l*2]),e.uvs[n].push(o[n][l*2+1]),e.uvs[n].push(o[n][d*2]),e.uvs[n].push(o[n][d*2+1]),e.uvs[n].push(o[n][f*2]),e.uvs[n].push(o[n][f*2+1])})}addMorphTargets(e,t,n,r){if(n.length===0)return;e.morphTargetsRelative=!0,e.morphAttributes.position=[];let i=r.clone().setPosition(0,0,0),a=this;n.forEach(function(n){n.rawTargets.forEach(function(n){let r=D.Objects.Geometry[n.geoID];r!==void 0&&a.genMorphGeometry(e,t,r,i,n.name)})})}genMorphGeometry(e,t,n,r,i){let a=t.Vertices===void 0?[]:t.Vertices.a,o=t.PolygonVertexIndex===void 0?[]:t.PolygonVertexIndex.a,s=n.Vertices===void 0?[]:n.Vertices.a,c=n.Indexes===void 0?[]:n.Indexes.a,l=e.attributes.position.count*3,u=new Float32Array(l);for(let e=0;e<c.length;e++){let t=c[e]*3;u[t]=s[e*3],u[t+1]=s[e*3+1],u[t+2]=s[e*3+2]}let d={vertexIndices:o,vertexPositions:u,baseVertexPositions:a},f=this.genBuffers(d),p=new g(f.vertex,3);p.name=i||n.attrName,p.applyMatrix4(r),e.morphAttributes.position.push(p)}parseNormals(e){let t=e.MappingInformationType,n=e.ReferenceInformationType,r=e.Normals.a,i=[];return n===`IndexToDirect`&&(`NormalIndex`in e?i=e.NormalIndex.a:`NormalsIndex`in e&&(i=e.NormalsIndex.a)),{dataSize:3,buffer:r,indices:i,mappingType:t,referenceType:n}}parseUVs(e){let t=e.MappingInformationType,n=e.ReferenceInformationType,r=e.UV.a,i=[];return n===`IndexToDirect`&&(i=e.UVIndex.a),{dataSize:2,buffer:r,indices:i,mappingType:t,referenceType:n}}parseVertexColors(e){let t=e.MappingInformationType,n=e.ReferenceInformationType,r=e.Colors.a,i=[];n===`IndexToDirect`&&(i=e.ColorIndex.a);for(let e=0,t=new Ne;e<r.length;e+=4)t.fromArray(r,e),Ie.colorSpaceToWorking(t,b),t.toArray(r,e);return{dataSize:4,buffer:r,indices:i,mappingType:t,referenceType:n}}parseMaterialIndices(e){let t=e.MappingInformationType,n=e.ReferenceInformationType;if(t===`NoMappingInformation`)return{dataSize:1,buffer:[0],indices:[0],mappingType:`AllSame`,referenceType:n};let r=e.Materials.a,i=[];for(let e=0;e<r.length;++e)i.push(e);return{dataSize:1,buffer:r,indices:i,mappingType:t,referenceType:n}}parseNurbsGeometry(e){let t=parseInt(e.Order);if(isNaN(t))return console.error(`THREE.FBXLoader: Invalid Order %s given for geometry ID: %s`,e.Order,e.id),new ye;let n=t-1,r=e.KnotVector.a,i=[],a=e.Points.a;for(let e=0,t=a.length;e<t;e+=4)i.push(new ae().fromArray(a,e));let o,s;if(e.Form===`Closed`)i.push(i[0]);else if(e.Form===`Periodic`){o=n,s=r.length-1-o;for(let e=0;e<n;++e)i.push(i[e])}let c=new un(n,r,i,o,s).getPoints(i.length*12);return new ye().setFromPoints(c)}},mn=class{constructor(e){this.trimAnimationClips=e}parse(){let e=[],t=this.parseClips();if(t!==void 0)for(let n in t){let r=t[n],i=this.addClip(r);e.push(i)}return e}parseClips(){if(D.Objects.AnimationCurve===void 0)return;let e=this.parseAnimationCurveNodes();this.parseAnimationCurves(e);let t=this.parseAnimationLayers(e);return this.parseAnimStacks(t)}parseAnimationCurveNodes(){let e=D.Objects.AnimationCurveNode,t=new Map;for(let n in e){let r=e[n];if(r.attrName.match(/S|R|T|DeformPercent/)!==null){let e={id:r.id,attr:r.attrName,curves:{}};t.set(e.id,e)}}return t}parseAnimationCurves(e){let t=D.Objects.AnimationCurve;for(let n in t){let r={id:t[n].id,times:t[n].KeyTime.a.map(Sn),values:t[n].KeyValueFloat.a},i=O.get(r.id);if(i!==void 0){let t=i.parents[0].ID,n=i.parents[0].relationship;n.match(/X/)?e.get(t).curves.x=r:n.match(/Y/)?e.get(t).curves.y=r:n.match(/Z/)?e.get(t).curves.z=r:n.match(/DeformPercent/)&&e.has(t)&&(e.get(t).curves.morph=r)}}}parseAnimationLayers(e){let t=D.Objects.AnimationLayer,n=new Map;for(let r in t){let t=[],i=O.get(parseInt(r));i!==void 0&&(i.children.forEach(function(n,r){if(e.has(n.ID)){let i=e.get(n.ID);if(i.curves.x!==void 0||i.curves.y!==void 0||i.curves.z!==void 0){if(t[r]===void 0){let e=O.get(n.ID).parents.filter(function(e){return e.relationship!==void 0});if(e.length===0)return;let i=e[0].ID;if(i!==void 0){let e=D.Objects.Model[i.toString()];if(e===void 0){console.warn(`THREE.FBXLoader: Encountered a unused curve.`,n);return}let a={modelName:e.attrName?ze.sanitizeNodeName(e.attrName):``,ID:e.id,initialPosition:[0,0,0],initialRotation:[0,0,0],initialScale:[1,1,1]};k.traverse(function(t){t.ID===e.id&&(a.transform=t.matrix,t.userData.transformData&&(a.eulerOrder=t.userData.transformData.eulerOrder,t.userData.transformData.rotation&&(a.initialRotation=t.userData.transformData.rotation)))}),a.transform||=new x,`PreRotation`in e&&(a.preRotation=e.PreRotation.value),`PostRotation`in e&&(a.postRotation=e.PostRotation.value),t[r]=a}}t[r]&&(t[r][i.attr]=i)}else if(i.curves.morph!==void 0){if(t[r]===void 0){let e=O.get(n.ID).parents.filter(function(e){return e.relationship!==void 0});if(e.length===0)return;let i=e[0].ID,a=O.get(i).parents[0].ID,o=O.get(a).parents[0].ID,s=O.get(o).parents[0].ID,c=D.Objects.Model[s],l={modelName:c.attrName?ze.sanitizeNodeName(c.attrName):``,morphName:D.Objects.Deformer[i].attrName};t[r]=l}t[r][i.attr]=i}}}),n.set(parseInt(r),t))}return n}parseAnimStacks(e){let t=D.Objects.AnimationStack,n={};for(let r in t){let i=O.get(parseInt(r)).children;i.length>1&&console.warn(`THREE.FBXLoader: Encountered an animation stack with multiple layers, this is currently not supported. Ignoring subsequent layers.`);let a=e.get(i[0].ID),o=t[r];n[r]={name:o.attrName,layer:a,localStart:o.LocalStart===void 0?0:Sn(Number(o.LocalStart.value)),localStop:o.LocalStop===void 0?0:Sn(Number(o.LocalStop.value))}}return n}addClip(e){let t=[],n=this;return e.layer.forEach(function(e){t=t.concat(n.generateTracks(e))}),this.trimAnimationClips===!0&&e.localStop>e.localStart&&(t=this.trimTracks(t,e.localStart,e.localStop)),new De(e.name,-1,t)}trimTracks(e,t,n){let r=Math.fround(t),i=Math.fround(n),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=n.getValueSize(),s=[],c=[];for(let e=0;e<n.times.length;e++){let t=n.times[e];if(!(t<r||t>i)){s.push(t-r);for(let t=0;t<o;t++)c.push(n.values[e*o+t])}}s.length!==0&&(n.times=new Float32Array(s),n.values=new Float32Array(c),a.push(n))}return a}generateTracks(e){let t=[],n=new S,i=new S;if(e.transform&&e.transform.decompose(n,new r,i),n=n.toArray(),i=i.toArray(),e.T!==void 0&&Object.keys(e.T.curves).length>0){let r=this.generateVectorTrack(e.modelName,e.T.curves,n,`position`);r!==void 0&&t.push(r)}if(e.R!==void 0&&Object.keys(e.R.curves).length>0){let n=this.generateRotationTrack(e.modelName,e.R.curves,e.preRotation,e.postRotation,e.eulerOrder,e.initialRotation);n!==void 0&&t.push(n)}if(e.S!==void 0&&Object.keys(e.S.curves).length>0){let n=this.generateVectorTrack(e.modelName,e.S.curves,i,`scale`);n!==void 0&&t.push(n)}if(e.DeformPercent!==void 0){let n=this.generateMorphTrack(e);n!==void 0&&t.push(n)}return t}generateVectorTrack(e,t,n,r){let i=this.getTimesForAllAxes(t),a=this.getKeyframeTrackValues(i,t,n);return new Pe(e+`.`+r,i,a)}generateRotationTrack(e,t,n,i,a,o){let s,c;if(t.x!==void 0||t.y!==void 0||t.z!==void 0){let e=this.getTimesForAllAxes(t);if(e.length>0){let n=o||[0,0,0],r=this.synchronizeCurve(t.x,e,n[0]),i=this.synchronizeCurve(t.y,e,n[1]),l=this.synchronizeCurve(t.z,e,n[2]),u=this.interpolateRotations(r,i,l,a);s=u[0],c=u[1]}}let l=On(0);n!==void 0&&(n=n.map(C.degToRad),n.push(l),n=new f().fromArray(n),n=new r().setFromEuler(n)),i!==void 0&&(i=i.map(C.degToRad),i.push(l),i=new f().fromArray(i),i=new r().setFromEuler(i).invert());let u=new r,d=new f,p=[];if(c&&s){for(let e=0;e<c.length;e+=3)d.set(c[e],c[e+1],c[e+2],a),u.setFromEuler(d),n!==void 0&&u.premultiply(n),i!==void 0&&u.multiply(i),e>2&&new r().fromArray(p,(e-3)/3*4).dot(u)<0&&u.set(-u.x,-u.y,-u.z,-u.w),u.toArray(p,e/3*4);return new ne(e+`.quaternion`,s,p)}}generateMorphTrack(e){let n=e.DeformPercent.curves.morph,r=n.values.map(function(e){return e/100}),i=k.getObjectByName(e.modelName).morphTargetDictionary[e.morphName];return new t(e.modelName+`.morphTargetInfluences[`+i+`]`,n.times,r)}getTimesForAllAxes(e){let t=[];if(e.x!==void 0&&(t=t.concat(e.x.times)),e.y!==void 0&&(t=t.concat(e.y.times)),e.z!==void 0&&(t=t.concat(e.z.times)),t=t.sort(function(e,t){return e-t}),t.length>1){let e=1,n=t[0];for(let r=1;r<t.length;r++){let i=t[r];i!==n&&(t[e]=i,n=i,e++)}t=t.slice(0,e)}return t}getKeyframeTrackValues(e,t,n){let r=n,i=[],a=-1,o=-1,s=-1;return e.forEach(function(e){if(t.x&&(a=t.x.times.indexOf(e)),t.y&&(o=t.y.times.indexOf(e)),t.z&&(s=t.z.times.indexOf(e)),a!==-1){let e=t.x.values[a];i.push(e),r[0]=e}else i.push(r[0]);if(o!==-1){let e=t.y.values[o];i.push(e),r[1]=e}else i.push(r[1]);if(s!==-1){let e=t.z.values[s];i.push(e),r[2]=e}else i.push(r[2])}),i}synchronizeCurve(e,t,n){if(e===void 0)return{times:t,values:t.map(()=>n)};if(e.times.length===t.length)return e;let r=[];for(let i=0;i<t.length;i++)r.push(this.sampleCurveValue(e,t[i],n));return{times:t,values:r}}sampleCurveValue(e,t,n){let r=e.times,i=e.values;if(t<=r[0])return i[0];if(t>=r[r.length-1])return i[i.length-1];for(let e=0;e<r.length-1;e++)if(t>=r[e]&&t<=r[e+1]){if(r[e]===t)return i[e];let n=(t-r[e])/(r[e+1]-r[e]);return i[e]*(1-n)+i[e+1]*n}return n}interpolateRotations(e,t,n,i){let a=[],o=[];a.push(e.times[0]),o.push(C.degToRad(e.values[0])),o.push(C.degToRad(t.values[0])),o.push(C.degToRad(n.values[0]));for(let s=1;s<e.values.length;s++){let c=[e.values[s-1],t.values[s-1],n.values[s-1]];if(isNaN(c[0])||isNaN(c[1])||isNaN(c[2]))continue;let l=c.map(C.degToRad),u=[e.values[s],t.values[s],n.values[s]];if(isNaN(u[0])||isNaN(u[1])||isNaN(u[2]))continue;let d=u.map(C.degToRad),p=[u[0]-c[0],u[1]-c[1],u[2]-c[2]],m=[Math.abs(p[0]),Math.abs(p[1]),Math.abs(p[2])];if(m[0]>=180||m[1]>=180||m[2]>=180){let t=Math.max(...m)/180,n=new f(...l,i),c=new f(...d,i),u=new r().setFromEuler(n),p=new r().setFromEuler(c);u.dot(p)<0&&p.set(-p.x,-p.y,-p.z,-p.w);let h=e.times[s-1],g=e.times[s]-h,_=new r,v=new f;for(let e=0;e<1;e+=1/t)_.copy(u.clone().slerp(p.clone(),e)),a.push(h+e*g),v.setFromQuaternion(_,i),o.push(v.x),o.push(v.y),o.push(v.z)}else a.push(e.times[s]),o.push(C.degToRad(e.values[s])),o.push(C.degToRad(t.values[s])),o.push(C.degToRad(n.values[s]))}return[a,o]}},hn=class{getPrevNode(){return this.nodeStack[this.currentIndent-2]}getCurrentNode(){return this.nodeStack[this.currentIndent-1]}getCurrentProp(){return this.currentProp}pushStack(e){this.nodeStack.push(e),this.currentIndent+=1}popStack(){this.nodeStack.pop(),--this.currentIndent}setCurrentProp(e,t){this.currentProp=e,this.currentPropName=t}parse(e){this.currentIndent=0,this.allNodes=new vn,this.nodeStack=[],this.currentProp=[],this.currentPropName=``;let t=this,n=e.split(/[\r\n]+/);return n.forEach(function(e,r){let i=e.match(/^[\s\t]*;/),a=e.match(/^[\s\t]*$/);if(i||a)return;let o=e.match(`^\\t{`+t.currentIndent+`}(\\w+):(.*){`,``),s=e.match(`^\\t{`+t.currentIndent+`}(\\w+):[\\s\\t\\r\\n](.*)`),c=e.match(`^\\t{`+(t.currentIndent-1)+`}}`);o?t.parseNodeBegin(e,o):s?t.parseNodeProperty(e,s,n[++r]):c?t.popStack():e.match(/^[^\s\t}]/)&&t.parseNodePropertyContinued(e)}),this.allNodes}parseNodeBegin(e,t){let n=t[1].trim().replace(/^"/,``).replace(/"$/,``),r=t[2].split(`,`).map(function(e){return e.trim().replace(/^"/,``).replace(/"$/,``)}),i={name:n},a=this.parseNodeAttr(r),o=this.getCurrentNode();this.currentIndent===0?this.allNodes.add(n,i):n in o?(n===`PoseNode`?o.PoseNode.push(i):o[n].id!==void 0&&(o[n]={},o[n][o[n].id]=o[n]),a.id!==``&&(o[n][a.id]=i)):typeof a.id==`number`?(o[n]={},o[n][a.id]=i):n!==`Properties70`&&(o[n]=n===`PoseNode`?[i]:i),typeof a.id==`number`&&(i.id=a.id),a.name!==``&&(i.attrName=a.name),a.type!==``&&(i.attrType=a.type),this.pushStack(i)}parseNodeAttr(e){let t=e[0];e[0]!==``&&(t=parseInt(e[0]),isNaN(t)&&(t=e[0]));let n=``,r=``;return e.length>1&&(n=e[1].replace(/^(\w+)::/,``),r=e[2]),{id:t,name:n,type:r}}parseNodeProperty(e,t,n){let r=t[1].replace(/^"/,``).replace(/"$/,``).trim(),i=t[2].replace(/^"/,``).replace(/"$/,``).trim();r===`Content`&&i===`,`&&(i=n.replace(/"/g,``).replace(/,$/,``).trim());let a=this.getCurrentNode();if(a.name===`Properties70`){this.parseNodeSpecialProperty(e,r,i);return}if(r===`C`){let e=i.split(`,`).slice(1),t=parseInt(e[0]),n=parseInt(e[1]),o=i.split(`,`).slice(3);o=o.map(function(e){return e.trim().replace(/^"/,``)}),r=`connections`,i=[t,n],jn(i,o),a[r]===void 0&&(a[r]=[])}r===`Node`&&(a.id=i),r in a&&Array.isArray(a[r])?a[r].push(i):r===`a`?a.a=i:a[r]=i,this.setCurrentProp(a,r),r===`a`&&i.slice(-1)!==`,`&&(a.a=kn(i))}parseNodePropertyContinued(e){let t=this.getCurrentNode();t.a+=e,e.slice(-1)!==`,`&&(t.a=kn(t.a))}parseNodeSpecialProperty(e,t,n){let r=n.split(`",`).map(function(e){return e.trim().replace(/^\"/,``).replace(/\s/,`_`)}),i=r[0],a=r[1],o=r[2],s=r[3],c=r[4];switch(a){case`int`:case`enum`:case`bool`:case`ULongLong`:case`double`:case`Number`:case`FieldOfView`:c=parseFloat(c);break;case`Color`:case`ColorRGB`:case`Vector3D`:case`Lcl_Translation`:case`Lcl_Rotation`:case`Lcl_Scaling`:c=kn(c)}this.getPrevNode()[i]={type:a,type2:o,flag:s,value:c},this.setCurrentProp(this.getPrevNode(),i)}},gn=class{parse(e){let t=new _n(e);t.skip(23);let n=t.getUint32();if(n<6400)throw Error(`THREE.FBXLoader: FBX version not supported, FileVersion: `+n);let r=new vn;for(;!this.endOfContent(t);){let e=this.parseNode(t,n);e!==null&&r.add(e.name,e)}return r}endOfContent(e){return e.size()%16==0?(e.getOffset()+160+16&-16)>=e.size():e.getOffset()+160+16>=e.size()}parseNode(e,t){let n={},r=t>=7500?e.getUint64():e.getUint32(),i=t>=7500?e.getUint64():e.getUint32();t>=7500?e.getUint64():e.getUint32();let a=e.getUint8(),o=e.getString(a);if(r===0)return null;let s=[];for(let t=0;t<i;t++)s.push(this.parseProperty(e));let c=s.length>0?s[0]:``,l=s.length>1?s[1]:``,u=s.length>2?s[2]:``;for(n.singleProperty=i===1&&e.getOffset()===r;r>e.getOffset();){let r=this.parseNode(e,t);r!==null&&this.parseSubNode(o,n,r)}return n.propertyList=s,typeof c==`number`&&(n.id=c),l!==``&&(n.attrName=l),u!==``&&(n.attrType=u),o!==``&&(n.name=o),n}parseSubNode(e,t,n){if(n.singleProperty===!0){let e=n.propertyList[0];Array.isArray(e)?(t[n.name]=n,n.a=e):t[n.name]=e}else if(e===`Connections`&&n.name===`C`){let e=[];n.propertyList.forEach(function(t,n){n!==0&&e.push(t)}),t.connections===void 0&&(t.connections=[]),t.connections.push(e)}else if(n.name===`Properties70`)Object.keys(n).forEach(function(e){t[e]=n[e]});else if(e===`Properties70`&&n.name===`P`){let e=n.propertyList[0],r=n.propertyList[1],i=n.propertyList[2],a=n.propertyList[3],o;e.indexOf(`Lcl `)===0&&(e=e.replace(`Lcl `,`Lcl_`)),r.indexOf(`Lcl `)===0&&(r=r.replace(`Lcl `,`Lcl_`)),o=r===`Color`||r===`ColorRGB`||r===`Vector`||r===`Vector3D`||r.indexOf(`Lcl_`)===0?[n.propertyList[4],n.propertyList[5],n.propertyList[6]]:n.propertyList[4],t[e]={type:r,type2:i,flag:a,value:o}}else t[n.name]===void 0?typeof n.id==`number`?(t[n.name]={},t[n.name][n.id]=n):t[n.name]=n:n.name===`PoseNode`?(Array.isArray(t[n.name])||(t[n.name]=[t[n.name]]),t[n.name].push(n)):t[n.name][n.id]===void 0&&(t[n.name][n.id]=n)}parseProperty(e){let t=e.getString(1),n;switch(t){case`C`:return e.getBoolean();case`D`:return e.getFloat64();case`F`:return e.getFloat32();case`I`:return e.getInt32();case`L`:return e.getInt64();case`R`:return n=e.getUint32(),e.getArrayBuffer(n);case`S`:return n=e.getUint32(),e.getString(n);case`Y`:return e.getInt16();case`b`:case`c`:case`d`:case`f`:case`i`:case`l`:let r=e.getUint32(),i=e.getUint32(),a=e.getUint32();if(i===0)switch(t){case`b`:case`c`:return e.getBooleanArray(r);case`d`:return e.getFloat64Array(r);case`f`:return e.getFloat32Array(r);case`i`:return e.getInt32Array(r);case`l`:return e.getInt64Array(r)}let o=new _n($t(new Uint8Array(e.getArrayBuffer(a))).buffer);switch(t){case`b`:case`c`:return o.getBooleanArray(r);case`d`:return o.getFloat64Array(r);case`f`:return o.getFloat32Array(r);case`i`:return o.getInt32Array(r);case`l`:return o.getInt64Array(r)}break;default:throw Error(`THREE.FBXLoader: Unknown property type `+t)}}},_n=class{constructor(e,t){this.dv=new DataView(e),this.offset=0,this.littleEndian=t===void 0||t,this._textDecoder=new TextDecoder}getOffset(){return this.offset}size(){return this.dv.buffer.byteLength}skip(e){this.offset+=e}getBoolean(){return(this.getUint8()&1)==1}getBooleanArray(e){let t=[];for(let n=0;n<e;n++)t.push(this.getBoolean());return t}getUint8(){let e=this.dv.getUint8(this.offset);return this.offset+=1,e}getInt16(){let e=this.dv.getInt16(this.offset,this.littleEndian);return this.offset+=2,e}getInt32(){let e=this.dv.getInt32(this.offset,this.littleEndian);return this.offset+=4,e}getInt32Array(e){let t=[];for(let n=0;n<e;n++)t.push(this.getInt32());return t}getUint32(){let e=this.dv.getUint32(this.offset,this.littleEndian);return this.offset+=4,e}getInt64(){let e,t;return this.littleEndian?(e=this.getUint32(),t=this.getUint32()):(t=this.getUint32(),e=this.getUint32()),t&2147483648?(t=~t&4294967295,e=~e&4294967295,e===4294967295&&(t=t+1&4294967295),e=e+1&4294967295,-(t*4294967296+e)):t*4294967296+e}getInt64Array(e){let t=[];for(let n=0;n<e;n++)t.push(this.getInt64());return t}getUint64(){let e,t;return this.littleEndian?(e=this.getUint32(),t=this.getUint32()):(t=this.getUint32(),e=this.getUint32()),t*4294967296+e}getFloat32(){let e=this.dv.getFloat32(this.offset,this.littleEndian);return this.offset+=4,e}getFloat32Array(e){let t=[];for(let n=0;n<e;n++)t.push(this.getFloat32());return t}getFloat64(){let e=this.dv.getFloat64(this.offset,this.littleEndian);return this.offset+=8,e}getFloat64Array(e){let t=[];for(let n=0;n<e;n++)t.push(this.getFloat64());return t}getArrayBuffer(e){let t=this.dv.buffer.slice(this.offset,this.offset+e);return this.offset+=e,t}getString(e){let t=this.offset,n=new Uint8Array(this.dv.buffer,t,e);this.skip(e);let r=n.indexOf(0);return r>=0&&(n=new Uint8Array(this.dv.buffer,t,r)),this._textDecoder.decode(n)}},vn=class{add(e,t){this[e]=t}};function yn(e){return e.byteLength>=21&&An(e,0,21)===`Kaydara FBX Binary  \0`}function bn(e){let t=[`K`,`a`,`y`,`d`,`a`,`r`,`a`,`\\`,`F`,`B`,`X`,`\\`,`B`,`i`,`n`,`a`,`r`,`y`,`\\`,`\\`],n=0;function r(t){let r=e[t-1];return e=e.slice(n+t),n++,r}for(let e=0;e<t.length;++e)if(r(1)===t[e])return!1;return!0}function xn(e){let t=e.match(/FBXVersion: (\d+)/);if(t)return parseInt(t[1]);throw Error(`THREE.FBXLoader: Cannot find the version number for the file given.`)}function Sn(e){return e/46186158e3}var Cn=[];function wn(e,t,n,r){let i;switch(r.mappingType){case`ByPolygonVertex`:i=e;break;case`ByPolygon`:i=t;break;case`ByVertice`:i=n;break;case`AllSame`:i=r.indices[0];break;default:console.warn(`THREE.FBXLoader: unknown attribute mapping type `+r.mappingType)}r.referenceType===`IndexToDirect`&&(i=r.indices[i]);let a=i*r.dataSize,o=a+r.dataSize;return Mn(Cn,r.buffer,a,o)}var Tn=new f,En=new S;function Dn(e){let t=new x,n=new x,r=new x,i=new x,a=new x,o=new x,s=new x,c=new x,l=new x,u=new x,d=new x,f=new x,p=e.inheritType?e.inheritType:0;e.translation&&t.setPosition(En.fromArray(e.translation));let m=On(0);if(e.preRotation){let t=e.preRotation.map(C.degToRad);t.push(m),n.makeRotationFromEuler(Tn.fromArray(t))}if(e.rotation){let t=e.rotation.map(C.degToRad);t.push(e.eulerOrder||m),r.makeRotationFromEuler(Tn.fromArray(t))}if(e.postRotation){let t=e.postRotation.map(C.degToRad);t.push(m),i.makeRotationFromEuler(Tn.fromArray(t)),i.invert()}e.scale&&a.scale(En.fromArray(e.scale)),e.scalingOffset&&s.setPosition(En.fromArray(e.scalingOffset)),e.scalingPivot&&o.setPosition(En.fromArray(e.scalingPivot)),e.rotationOffset&&c.setPosition(En.fromArray(e.rotationOffset)),e.rotationPivot&&l.setPosition(En.fromArray(e.rotationPivot)),e.parentMatrixWorld&&(d.copy(e.parentMatrix),u.copy(e.parentMatrixWorld));let h=n.clone().multiply(r).multiply(i),g=new x;g.extractRotation(u);let _=new x;_.copyPosition(u);let v=_.clone().invert().multiply(u),y=g.clone().invert().multiply(v),ee=a,te=new x;if(p===0)te.copy(g).multiply(h).multiply(y).multiply(ee);else if(p===1)te.copy(g).multiply(y).multiply(h).multiply(ee);else{let e=new x().scale(new S().setFromMatrixScale(d)).clone().invert(),t=y.clone().multiply(e);te.copy(g).multiply(h).multiply(t).multiply(ee)}let ne=l.clone().invert(),re=o.clone().invert(),b=t.clone().multiply(c).multiply(l).multiply(n).multiply(r).multiply(i).multiply(ne).multiply(s).multiply(o).multiply(a).multiply(re),ie=new x().copyPosition(b),ae=u.clone().multiply(ie);return f.copyPosition(ae),b=f.clone().multiply(te),b.premultiply(u.invert()),b}function On(e){e||=0;let t=[`ZYX`,`YZX`,`XZY`,`ZXY`,`YXZ`,`XYZ`];return e===6?(console.warn(`THREE.FBXLoader: unsupported Euler Order: Spherical XYZ. Animations and rotations may be incorrect.`),t[0]):t[e]}function kn(e){return e.split(`,`).map(function(e){return parseFloat(e)})}function An(e,t,n){return t===void 0&&(t=0),n===void 0&&(n=e.byteLength),new TextDecoder().decode(new Uint8Array(e,t,n))}function jn(e,t){for(let n=0,r=e.length,i=t.length;n<i;n++,r++)e[r]=t[n]}function Mn(e,t,n,r){for(let i=n,a=0;i<r;i++,a++)e[a]=t[i];return e}var Nn=e=>new URL(e,new URL(`./`,location.href)).href,Pn=class{renderer;cache=new Map;textures=new _e;constructor(e){this.renderer=e}async model(e){let t=e.obj+`|`+(e.mtl??``)+`|`+(e.unitScale??1),n=this.cache.get(t);return n||(n=this.load(e),this.cache.set(t,n)),(await n).clone(!0)}async load(e){let t=Nn(e.obj),n=new Me,r=[],i;e.mtl&&!t.toLowerCase().endsWith(`.fbx`)&&(i=await new lt(n).loadAsync(Nn(e.mtl)));let o=new Promise(e=>{n.onLoad=e});n.onError=e=>{r.push(e)};let s;if(t.toLowerCase().endsWith(`.fbx`))s=await new dn(n).loadAsync(t);else{let e=new Ct(n);i&&(i.preload(),e.setMaterials(i)),s=await e.loadAsync(t)}if(await o,r.length)throw Error(`Missing model resources: `+r.join(`, `));return s.scale.setScalar(e.unitScale??1),s.traverse(t=>{if(!(t instanceof Fe))return;t.castShadow=!1,t.receiveShadow=!0;let n=Array.isArray(t.material)?t.material:[t.material];for(let t of n){t.side=2;let n=t,r=e.materials?.[t.name.replace(/\|$/,``)];r&&(t.alphaTest=r.blendMode===1?Math.min(255,Math.max(0,r.maskReference))/255+1e-7:0,t.transparent=r.blendMode===2,t.depthWrite=r.blendMode!==2),n.map&&(n.map.colorSpace=b,n.map.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy())),t instanceof a&&(t.specular.setScalar(.03),t.shininess=8,t.name===`EMFX_Default`&&t.color.set(12297611))}}),s}async texture(e){let t=await this.textures.loadAsync(Nn(e));return t.colorSpace=b,t}},Fn=1.65,In=.28,Ln=.35,Rn=Math.cos(50*Math.PI/180),zn=18,Bn=16,A=.015,Vn=.0025,Hn=Math.PI/2-.02,Un=new S(0,-1,0),Wn=new Set([`KeyW`,`KeyA`,`KeyS`,`KeyD`,`ArrowUp`,`ArrowLeft`,`ArrowDown`,`ArrowRight`,`ShiftLeft`,`ShiftRight`,`Space`,`KeyQ`]),Gn={KeyE:`interact`,Tab:`inspect`,KeyJ:`journal`,KeyP:`save`,KeyR:`reset`,KeyM:`map`},Kn=class{camera;canvas;onAction;speed=4.3;enabled=!0;flying=!1;supported=!1;fallbackFloor=null;verticalSpeed=0;location=new S;yaw=0;pitch=0;spawn;spawnYaw=0;disposed=!1;dragging=!1;dragged=!1;dragDistance=0;pointerId=null;pointerX=0;pointerY=0;keys=new Set;cells=new Map;wideSurfaces=[];surfacesByMesh=new Map;candidateSet=new Set;candidates=[];intersections=[];raycaster=new u;rayOrigin=new S;rayDirection=new S;normal=new S;movement=new S;slide=new S;instanceMatrix=new x;combinedMatrix=new x;proposedPosition=new S;instanceNormalMatrix=new fe;originalTabIndex;walkSurfaceReady=null;constructor(e,t,n){this.camera=e,this.canvas=t,this.onAction=n,this.originalTabIndex=this.canvas.getAttribute(`tabindex`),this.originalTabIndex===null&&(this.canvas.tabIndex=0),this.location.copy(this.camera.position),this.camera.rotation.order=`YXZ`,this.yaw=this.camera.rotation.y,this.pitch=C.clamp(this.camera.rotation.x,-Hn,Hn),this.spawn=[this.position.x,this.position.y,this.position.z],this.spawnYaw=this.yaw,this.applyLook(),document.addEventListener(`keydown`,this.onKeyDown),document.addEventListener(`keyup`,this.onKeyUp),document.addEventListener(`mousemove`,this.onMouseMove),document.addEventListener(`pointermove`,this.onPointerMove),document.addEventListener(`pointerup`,this.onPointerUp),document.addEventListener(`pointercancel`,this.onPointerUp),document.addEventListener(`pointerlockchange`,this.onPointerLockChange),document.addEventListener(`visibilitychange`,this.onVisibilityChange),document.addEventListener(`focusin`,this.onFocusIn),window.addEventListener(`blur`,this.onBlur),this.canvas.addEventListener(`pointerdown`,this.onPointerDown),this.canvas.addEventListener(`click`,this.onCanvasClick),this.canvas.addEventListener(`contextmenu`,this.onContextMenu)}get active(){return this.enabled}set active(e){this.enabled=e&&!this.disposed,this.enabled||(this.clearInput(),this.unlockPointer())}get fly(){return this.flying}set fly(e){this.flying!==e&&(this.flying=e,this.verticalSpeed=0,this.supported=!1)}get position(){return this.location}get heading(){return this.yaw}get viewPitch(){return this.pitch}get grounded(){return!this.flying&&this.supported}get groundFallback(){return!this.flying&&this.fallbackFloor!==null}setWorld(e,t,n=0){this.setGeometry(e),this.spawn=[...t],this.spawnYaw=Number.isFinite(n)?n:0,this.fly=!1,this.reset()}setGeometry(e){this.cells.clear(),this.wideSurfaces.length=0,this.surfacesByMesh.clear();let t=new Set;for(let n of e)n.updateWorldMatrix(!0,!0),n.traverse(e=>{if(t.has(e))return;t.add(e);let n=e;if(!n.isMesh||!n.geometry.getAttribute(`position`))return;let r=new le().setFromObject(n);if(r.isEmpty()||!Number.isFinite(r.min.x+r.max.x+r.min.y+r.max.y+r.min.z+r.max.z))return;let i={mesh:n,bounds:r,normalMatrix:new fe().getNormalMatrix(n.matrixWorld)};this.surfacesByMesh.set(n,i);let a=Math.floor(r.min.x/Bn),o=Math.floor(r.max.x/Bn),s=Math.floor(r.min.z/Bn),c=Math.floor(r.max.z/Bn);if((o-a+1)*(c-s+1)>256){this.wideSurfaces.push(i);return}for(let e=a;e<=o;e++)for(let t=s;t<=c;t++){let n=`${e},${t}`,r=this.cells.get(n);r?r.push(i):this.cells.set(n,[i])}})}reset(){this.fly=!1,this.teleport(this.spawn,this.spawnYaw,0)}teleport(e,t=this.yaw,n=this.pitch){if(!e.every(Number.isFinite)||(this.position.set(...e),Number.isFinite(t)&&(this.yaw=t),Number.isFinite(n)&&(this.pitch=C.clamp(n,-Hn,Hn)),this.verticalSpeed=0,this.supported=!1,this.fallbackFloor=null,this.clearInput(),this.applyLook(),this.flying))return;let r=this.findGround(this.position.x,this.position.z,this.position.y+A,256);r?(this.position.y=r.height+Fn,this.supported=!0):(this.fallbackFloor=this.position.y-Fn,this.supported=!0)}getState(){return{position:[this.position.x,this.position.y,this.position.z],yaw:this.yaw,pitch:this.pitch,fly:this.flying}}update(e){if(!this.enabled||this.disposed||!Number.isFinite(e)||e<=0||!this.flying&&this.walkSurfaceReady&&!this.walkSurfaceReady(this.position))return;let t=Math.min(e,.1),n=Math.ceil(t/(1/60)),r=t/n,i=Number(this.keys.has(`KeyW`)||this.keys.has(`ArrowUp`))-Number(this.keys.has(`KeyS`)||this.keys.has(`ArrowDown`)),a=Number(this.keys.has(`KeyD`)||this.keys.has(`ArrowRight`))-Number(this.keys.has(`KeyA`)||this.keys.has(`ArrowLeft`)),o=this.keys.has(`ShiftLeft`)||this.keys.has(`ShiftRight`),s=Math.max(0,Number.isFinite(this.speed)?this.speed:4.3)*(o?1.8:1);for(let e=0;e<n;e++)this.movement.set(Math.cos(this.yaw)*a-Math.sin(this.yaw)*i,0,-Math.sin(this.yaw)*a-Math.cos(this.yaw)*i),this.flying?(this.movement.set(Math.cos(this.yaw)*a-Math.sin(this.yaw)*Math.cos(this.pitch)*i,Math.sin(this.pitch)*i+Number(this.keys.has(`Space`))-Number(this.keys.has(`KeyQ`)),-Math.sin(this.yaw)*a-Math.cos(this.yaw)*Math.cos(this.pitch)*i),this.movement.lengthSq()>0&&this.movement.normalize().multiplyScalar(s*r),this.moveWithWalls(this.movement,!0),this.supported=!1):(this.movement.lengthSq()>0&&this.movement.normalize().multiplyScalar(s*r),this.moveWithWalls(this.movement,!1),this.settleOnGround(r));this.camera.position.copy(this.position),this.camera.updateMatrixWorld()}destroy(){this.disposed||(this.active=!1,this.disposed=!0,document.removeEventListener(`keydown`,this.onKeyDown),document.removeEventListener(`keyup`,this.onKeyUp),document.removeEventListener(`mousemove`,this.onMouseMove),document.removeEventListener(`pointermove`,this.onPointerMove),document.removeEventListener(`pointerup`,this.onPointerUp),document.removeEventListener(`pointercancel`,this.onPointerUp),document.removeEventListener(`pointerlockchange`,this.onPointerLockChange),document.removeEventListener(`visibilitychange`,this.onVisibilityChange),document.removeEventListener(`focusin`,this.onFocusIn),window.removeEventListener(`blur`,this.onBlur),this.canvas.removeEventListener(`pointerdown`,this.onPointerDown),this.canvas.removeEventListener(`click`,this.onCanvasClick),this.canvas.removeEventListener(`contextmenu`,this.onContextMenu),this.originalTabIndex===null&&this.canvas.getAttribute(`tabindex`)===`0`&&this.canvas.removeAttribute(`tabindex`),this.cells.clear(),this.wideSurfaces.length=0,this.surfacesByMesh.clear(),this.candidateSet.clear(),this.candidates.length=0,this.intersections.length=0)}collectCandidates(e,t,n,r,i,a){this.candidateSet.clear(),this.candidates.length=0;let o=o=>{if(this.candidateSet.has(o))return;this.candidateSet.add(o);let s=o.bounds;s.max.x<e||s.min.x>t||s.max.y<n||s.min.y>r||s.max.z<i||s.min.z>a||this.candidates.push(o.mesh)};for(let e of this.wideSurfaces)o(e);for(let n=Math.floor(e/Bn);n<=Math.floor(t/Bn);n++)for(let e=Math.floor(i/Bn);e<=Math.floor(a/Bn);e++){let t=this.cells.get(`${n},${e}`);if(t)for(let e of t)o(e)}return this.candidates}hitNormal(e){this.normal.copy(e.face?.normal??Un);let t=e.object;if(t.isInstancedMesh&&e.instanceId!==void 0)t.getMatrixAt(e.instanceId,this.instanceMatrix),this.combinedMatrix.multiplyMatrices(t.matrixWorld,this.instanceMatrix),this.instanceNormalMatrix.getNormalMatrix(this.combinedMatrix),this.normal.applyMatrix3(this.instanceNormalMatrix).normalize();else{let t=this.surfacesByMesh.get(e.object);t&&this.normal.applyMatrix3(t.normalMatrix).normalize()}return this.normal}findGround(e,t,n,r){let i=this.collectCandidates(e-A,e+A,n-r,n+A,t-A,t+A);if(i.length===0)return null;this.rayOrigin.set(e,n,t),this.raycaster.set(this.rayOrigin,Un),this.raycaster.near=0,this.raycaster.far=r,this.intersections.length=0,this.raycaster.intersectObjects(i,!1,this.intersections);for(let e of this.intersections)if(e.face&&Math.abs(this.hitNormal(e).y)>=Rn)return{height:e.point.y};return null}settleOnGround(e){let t=this.position.y-Fn;this.fallbackFloor!==null&&this.findGround(this.position.x,this.position.z,t+Ln+A,256)&&(this.fallbackFloor=null);let n=Math.max(0,-this.verticalSpeed*e)+zn*e*e,r=this.findGround(this.position.x,this.position.z,t+Ln+A,Ln+Math.max(1,n+A))?.height??this.fallbackFloor;if(r!==null&&this.supported&&r<=t+Ln+A&&r>=t-Ln){this.position.y=r+Fn,this.verticalSpeed=0;return}this.supported=!1,this.verticalSpeed=Math.max(-35,this.verticalSpeed-zn*e);let i=t+this.verticalSpeed*e;r!==null&&r>=i-A&&r<=t+Ln+A?(this.position.y=r+Fn,this.verticalSpeed=0,this.supported=!0):this.position.y=i+Fn}moveWithWalls(e,t){if(e.lengthSq()===0||!t&&this.walkSurfaceReady&&!this.walkSurfaceReady(this.proposedPosition.copy(this.position).add(e)))return;let n=this.sweep(e,t);if(!n){this.position.add(e);return}let r=e.length(),i=C.clamp((n.distance-In-A)/r,0,1);if(this.position.addScaledVector(e,i),this.slide.copy(e).multiplyScalar(1-i),t||(n.normal.y=0),n.normal.normalize(),this.slide.addScaledVector(n.normal,-this.slide.dot(n.normal)),this.slide.lengthSq()<1e-10)return;let a=this.sweep(this.slide,t);if(a){let e=C.clamp((a.distance-In-A)/this.slide.length(),0,1);this.position.addScaledVector(this.slide,e)}else this.position.add(this.slide)}sweep(e,t){let n=e.length();if(n<=0)return null;let r=this.position.y-Fn,i=.29500000000000004,a=this.collectCandidates(Math.min(this.position.x,this.position.x+e.x)-i,Math.max(this.position.x,this.position.x+e.x)+i,Math.min(r,r+e.y)-i,Math.max(this.position.y,this.position.y+e.y)+i,Math.min(this.position.z,this.position.z+e.z)-i,Math.max(this.position.z,this.position.z+e.z)+i);if(a.length===0)return null;this.rayDirection.copy(e).divideScalar(n),this.raycaster.near=0,this.raycaster.far=n+i;let o=null,s=-this.rayDirection.z*In*.85,c=this.rayDirection.x*In*.85,l=t?[A,Fn*.55,Fn]:[.365,Fn*.55,Fn];for(let e of l)for(let n of[-1,0,1]){this.rayOrigin.set(this.position.x+s*n,r+e,this.position.z+c*n),this.raycaster.set(this.rayOrigin,this.rayDirection),this.intersections.length=0,this.raycaster.intersectObjects(a,!1,this.intersections);for(let e of this.intersections){if(!e.face)continue;let n=this.hitNormal(e);if(!(!t&&Math.abs(n.y)>=Rn)){(!o||e.distance<o.distance)&&(o={distance:e.distance,normal:n.clone()});break}}}return o}applyLook(){this.camera.position.copy(this.position),this.camera.rotation.set(this.pitch,this.yaw,0,`YXZ`),this.camera.updateMatrixWorld()}isFormTarget(e){return e instanceof Element&&!!e.closest(`input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="textbox"]`)}clearInput(){this.keys.clear(),this.dragging=!1,this.pointerId!==null&&(this.canvas.hasPointerCapture(this.pointerId)&&this.canvas.releasePointerCapture(this.pointerId),this.pointerId=null)}unlockPointer(){document.pointerLockElement===this.canvas&&document.exitPointerLock()}onKeyDown=e=>{if(e.code===`Escape`){this.clearInput(),this.unlockPointer();return}if(!this.enabled||this.disposed||this.isFormTarget(e.target)||e.ctrlKey||e.metaKey||e.altKey)return;if(Wn.has(e.code)){this.keys.add(e.code),e.preventDefault();return}if(e.code===`KeyF`){e.preventDefault(),e.repeat||(this.fly=!this.fly,this.onAction(`fly`));return}let t=Gn[e.code];t&&(e.preventDefault(),e.repeat||this.onAction(t))};onKeyUp=e=>{this.keys.delete(e.code)};onPointerDown=e=>{!this.enabled||this.disposed||e.button!==0&&e.button!==2||(this.dragging=!0,this.dragged=!1,this.dragDistance=0,this.pointerId=e.pointerId,this.pointerX=e.clientX,this.pointerY=e.clientY,this.canvas.setPointerCapture(e.pointerId),this.canvas.focus({preventScroll:!0}),e.preventDefault())};onPointerUp=e=>{e.pointerId===this.pointerId&&this.clearInputPointer()};clearInputPointer(){this.dragging=!1,this.pointerId!==null&&(this.canvas.hasPointerCapture(this.pointerId)&&this.canvas.releasePointerCapture(this.pointerId),this.pointerId=null)}onMouseMove=e=>{this.enabled&&!this.disposed&&document.pointerLockElement===this.canvas&&this.rotateLook(e.movementX,e.movementY)};onPointerMove=e=>{if(!this.enabled||this.disposed||document.pointerLockElement===this.canvas||!this.dragging||e.pointerId!==this.pointerId||e.buttons===0)return;let t=e.clientX-this.pointerX,n=e.clientY-this.pointerY;this.pointerX=e.clientX,this.pointerY=e.clientY,this.dragDistance+=Math.hypot(t,n),this.dragDistance>4&&(this.dragged=!0),this.rotateLook(t,n)};rotateLook(e,t){Number.isFinite(e)&&Number.isFinite(t)&&(this.yaw-=e*Vn,this.pitch=C.clamp(this.pitch-t*Vn,-Hn,Hn),this.applyLook())}onCanvasClick=e=>{if(!(!this.enabled||this.disposed||this.dragged||e.button!==0||document.pointerLockElement===this.canvas))try{typeof this.canvas.requestPointerLock==`function`&&Promise.resolve(this.canvas.requestPointerLock()).catch(()=>void 0)}catch{}};onPointerLockChange=()=>{this.clearInputPointer(),document.pointerLockElement!==this.canvas&&this.keys.clear()};onContextMenu=e=>{this.enabled&&e.preventDefault()};onBlur=()=>{this.clearInput(),this.unlockPointer()};onVisibilityChange=()=>{document.hidden&&this.onBlur()};onFocusIn=e=>{this.isFormTarget(e.target)&&this.onBlur()}};function qn(e){let t=e.geometry,n=t.getAttribute(`_g3_weights_0`);if(!n)throw Error(`Native weight backup missing for `+e.name);t.setAttribute(`skinWeight`,n.clone());let r=[{joints:t.getAttribute(`skinIndex`),weights:t.getAttribute(`skinWeight`)}];for(let e=1;t.hasAttribute(`joints_`+e);e++){let n=t.getAttribute(`weights_`+e);if(!n)throw Error(`Native skin weight set missing: `+e);r.push({joints:t.getAttribute(`joints_`+e),weights:n})}for(let n of r)if(!n.joints||!n.weights||n.joints.itemSize!==4||n.weights.itemSize!==4||n.joints.count!==t.getAttribute(`position`).count||n.weights.count!==n.joints.count)throw Error(`Invalid native influence layout for `+e.name);let i=r.slice(1).map((e,t)=>`attribute vec4 joints_`+(t+1)+`;
attribute vec4 weights_`+(t+1)+`;`).join(`
`),a=r.map((e,t)=>{let n=t?`joints_`+t:`skinIndex`,r=t?`weights_`+t:`skinWeight`;return[`x`,`y`,`z`,`w`].map(e=>`g3SkinMatrix += `+r+`.`+e+` * getBoneMatrix(`+n+`.`+e+`);`).join(`
`)}).join(`
`),o=e=>{let t=e.clone();return t.userData.gothic3ActorOwned=!0,t.onBeforeCompile=e=>{e.vertexShader=e.vertexShader.replace(`#include <skinning_pars_vertex>`,`#include <skinning_pars_vertex>
#ifdef USE_SKINNING
`+i+`
#endif`).replace(`#include <skinbase_vertex>`,`#ifdef USE_SKINNING
mat4 g3SkinMatrix = mat4(0.0);
`+a+`
g3SkinMatrix = bindMatrixInverse * g3SkinMatrix * bindMatrix;
#endif`).replace(`#include <skinnormal_vertex>`,`#ifdef USE_SKINNING
objectNormal = (g3SkinMatrix * vec4(objectNormal, 0.0)).xyz;
#ifdef USE_TANGENT
objectTangent = (g3SkinMatrix * vec4(objectTangent, 0.0)).xyz;
#endif
#endif`).replace(`#include <skinning_vertex>`,`#ifdef USE_SKINNING
transformed = (g3SkinMatrix * vec4(transformed, 1.0)).xyz;
#endif`)},t.customProgramCacheKey=()=>`gothic3-native-skin:`+r.length,t};e.material=Array.isArray(e.material)?e.material.map(o):o(e.material);let s=new ae,c=new ae,l=new x;e.applyBoneTransform=(t,n)=>{s.set(n.x,n.y,n.z,n instanceof ae?n.w:1).applyMatrix4(e.bindMatrix),n instanceof ae?n.set(0,0,0,0):n.set(0,0,0);for(let i of r)for(let r=0;r<4;r++){let a=i.weights.getComponent(t,r);if(!a)continue;let o=i.joints.getComponent(t,r),u=e.skeleton.bones[o],d=e.skeleton.boneInverses[o];if(!u||!d)throw Error(`Native joint out of range: `+o);l.multiplyMatrices(u.matrixWorld,d),c.copy(s).applyMatrix4(l),n.addScaledVector(c,a)}return n instanceof ae&&(n.w=s.w),n.applyMatrix4(e.bindMatrixInverse),n},e.userData.nativeInfluenceSets=r.length,e.computeBoundingBox(),e.computeBoundingSphere(),e.frustumCulled=!1}var Jn=Object.freeze({module:`Engine.dll`,sha256:`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`,packing:`300f0090 -> 30672060: truncate(rawFloat * 32767), signed int16`,decodeConstantAddress:`30822a80`,decodeConstantBytes:`000000002000003f`,rotation:`3064e8d0 -> 3064e790: shortest-sign component lerp`,normalization:`30663630 -> 30663190 -> 30663330: normalize layer result`,poseFallback:`3064fab0: native MotionPart pose for absent keys`,scope:`one full-weight native clip; original gameplay blending/repositioning/effects are separate`}),Yn=Math.fround,Xn=30518509447574615e-21;function Zn(e,t){if(typeof e!=`object`||!e||Array.isArray(e))throw Error(`Invalid native motion `+t);return e}function Qn(e,t){if(!Array.isArray(e))throw Error(`Invalid native motion list: `+t);return e}function $n(e,t){if(typeof e!=`string`||e.length===0)throw Error(`Invalid native motion name: `+t);return e}function er(e,t){if(typeof e!=`number`||!Number.isFinite(e))throw Error(`Invalid native motion number: `+t);return e}function tr(e,t,n){let r=Qn(e,n);if(r.length!==t)throw Error(`Invalid native motion vector: `+n);return r.map(e=>er(e,n))}function nr(e){return[e[0]/100,e[1]/100,-e[2]/100]}function rr(e){return[-e[0],-e[1],e[2],e[3]]}function ir(e){return rr(e.map(e=>{let t=Math.trunc(e*32767);if(t<-32768||t>32767)throw Error(`Native quaternion exceeds signed-short packing range`);return Yn(t*Xn)}))}function ar(e,t){let n=Zn(e,t),r=tr(n.position,3,t+`.position`),i=tr(n.rotation,4,t+`.rotation`),a=tr(n.scale,3,t+`.scale`);if(i.reduce((e,t)=>e+t*t,0)<=1e-12||a.some(e=>Math.abs(e-1)>1e-4))throw Error(`Unsupported degenerate/scaled native motion pose: `+t);return{position:nr(r),rotation:rr(i),scale:a}}function or(e,t){let n=Zn(e,t);if(n.interpolation!==`L`)throw Error(`Unsupported native interpolation: `+t);if(n.type!==`P`&&n.type!==`R`&&n.type!==`S`)throw Error(`Unknown native motion channel: `+t);let r=n.type,i=r===`R`?4:3,a=Qn(n.keys,t+`.keys`),o=new Float32Array(a.length),s=new Float32Array(a.length*i),c=-1/0;if(a.forEach((e,n)=>{let a=Zn(e,t+`.key`),l=er(a.time,t+`.time`);if(l<0||l<=c)throw Error(`Invalid native motion key order: `+t);c=l,o[n]=l;let u;if(r===`R`){let e=tr(a.value,4,t+`.quaternion`);if(Math.abs(e.reduce((e,t)=>e+t*t,0)-1)>.001)throw Error(`Non-unit native source quaternion: `+t);u=ir(e)}else if(u=tr(a.value,3,t+`.vector`),r!==`P`&&u.some(e=>Math.abs(e-1)>1e-4))throw Error(`Unsupported non-unit animated scale: `+t);s.set(u,n*i)}),o.length&&o[0]!==0)throw Error(`Native positive-first-key normalization needs an explicit export profile`);return{type:r,times:o,values:s,width:i}}function sr(e){let t=Zn(e,`document`);if(t.version!==1||t.nativeUnits!==`centimetres`)throw Error(`Unsupported native motion document`);let n=Qn(t.sharedCleanedRig,`sharedCleanedRig`).map(e=>$n(Zn(e,`rig node`).name,`rig node`));if(new Set(n).size!==n.length)throw Error(`Duplicate native rig name`);let r=new Set(n),i=new Map;for(let e of Qn(t.motions,`motions`)){let t=Zn(e,`motion`),n=$n(t.name,`motion`);if(i.has(n))throw Error(`Duplicate native clip: `+n);let a=Zn(t.decoded,n+`.decoded`),o=er(Zn(a.audit,n+`.audit`).duration,n+`.duration`);if(o<=0)throw Error(`Invalid native motion duration: `+n);let s=new Map;for(let e of Qn(a.parts,n+`.parts`)){let t=Zn(e,n+`.part`),i=$n(t.name,n+`.part`);if(!r.has(i))continue;if(s.has(i))throw Error(`Duplicate native motion part: `+i);let a={};for(let e of Qn(t.tracks,n+`.`+i+`.tracks`)){let t=or(e,n+`.`+i);if(a[t.type])throw Error(`Duplicate native motion channel: `+i);if(t.times.length&&t.times[t.times.length-1]>o)throw Error(`Native key exceeds clip duration: `+i);a[t.type]=t}s.set(i,{name:i,pose:ar(t.pose,n+`.`+i),tracks:a})}i.set(n,{name:n,duration:o,parts:s})}return{names:n,motions:i}}function cr(e,t,n){let{times:r,values:i,width:a}=e;if(r.length===0)throw Error(`Empty keyed native track cannot be sampled`);let o=0,s=r.length-1;if(t<=r[0])s=0;else if(t>=r[s])o=s;else for(;s-o>1;){let e=o+s>>>1;r[e]<=t?o=e:s=e}let c=o===s?0:Yn((Yn(t)-r[o])/(r[s]-r[o])),l=Yn(1-c);if(e.type===`R`){let e=0;for(let t=0;t<4;t++)e+=i[o*a+t]*i[s*a+t];Yn(e)<0&&(c=-c)}for(let e=0;e<a;e++)n[e]=Yn(i[o*a+e]*l+i[s*a+e]*c)}function lr(e){let t=Yn(e[0]**2+e[1]**2+e[2]**2+e[3]**2),n=Yn(Math.sqrt(t));if(!Number.isFinite(n)||n<=1e-10)throw Error(`Degenerate native sampled quaternion`);let r=Yn(1/n);for(let t=0;t<4;t++)e[t]=Yn(e[t]*r)}var ur=class{root;clipNames;evidence=Jn;playing=!1;bindings;motions;selected=null;time=0;p=[0,0,0];q=[0,0,0,1];s=[1,1,1];constructor(e,t){this.root=e;let n=sr(t);this.motions=n.motions,this.clipNames=Object.freeze([...this.motions.keys()]),this.bindings=n.names.map(t=>{let n=e.getObjectByName(t);if(!(n instanceof ge))throw Error(`Native animated bone is missing: `+t);return{name:t,bone:n,bindPosition:n.position.clone(),bindQuaternion:n.quaternion.clone(),bindScale:n.scale.clone()}})}get clipName(){return this.selected?.name??null}get duration(){return this.selected?.duration??null}sampleAt(e){if(!Number.isFinite(e)||e<0)throw Error(`Invalid native animation time`);if(!this.selected)throw Error(`No native clip selected for explicit sampling`);this.apply(this.selected,e)}select(e){let t=e===null?null:this.motions.get(e);if(e!==null&&!t)throw Error(`Native clip is missing: `+e);this.selected=t??null,this.time=0,this.playing=this.selected!==null,this.resetBind(),this.selected&&this.apply(this.selected,0)}update(e){if(!Number.isFinite(e)||e<0)throw Error(`Invalid native animation delta`);this.playing&&this.selected&&(this.time=(this.time+e)%this.selected.duration,this.apply(this.selected,this.time))}resetBind(){for(let{bone:e,bindPosition:t,bindQuaternion:n,bindScale:r}of this.bindings)e.position.copy(t),e.quaternion.copy(n),e.scale.copy(r);this.root.updateMatrixWorld(!0)}apply(e,t){for(let n of this.bindings){let r=e.parts.get(n.name);if(!r){n.bone.position.copy(n.bindPosition),n.bone.quaternion.copy(n.bindQuaternion),n.bone.scale.copy(n.bindScale);continue}let i=r.tracks.P;if(i?.times.length)cr(i,t,this.p),this.p[0]/=100,this.p[1]/=100,this.p[2]/=-100;else for(let e=0;e<3;e++)this.p[e]=r.pose.position[e];let a=r.tracks.R;if(a?.times.length)cr(a,t,this.q);else for(let e=0;e<4;e++)this.q[e]=r.pose.rotation[e];lr(this.q);let o=r.tracks.S;if(o?.times.length)cr(o,t,this.s);else for(let e=0;e<3;e++)this.s[e]=r.pose.scale[e];n.bone.position.set(this.p[0],this.p[1],this.p[2]),n.bone.quaternion.set(this.q[0],this.q[1],this.q[2],this.q[3]),n.bone.scale.set(this.s[0],this.s[1],this.s[2])}this.root.updateMatrixWorld(!0)}},dr=class{object;asset;motion;selected=null;disposed=!1;constructor(e,t,n){this.object=e,this.asset=t,this.motion=new ur(e,n);for(let e of t.clips)if(!this.motion.clipNames.includes(e.name))throw Error(`Native channel data is missing: `+e.name)}get clip(){return this.selected}get playing(){return this.motion.playing}set playing(e){this.motion.playing=e}select(e){let t=e===null?null:this.asset.clips.find(t=>t.name===e);if(e!==null&&!t)throw Error(`Native clip is missing: `+e);this.motion.select(e),this.selected=t??null}update(e){this.motion.update(e)}destroy(){this.disposed||(this.disposed=!0,this.motion.select(null),fr(this.object))}};function fr(e){let t=new Set,n=new Set;e.traverse(e=>{if(e instanceof xe&&t.add(e.skeleton),e instanceof Fe)for(let t of Array.isArray(e.material)?e.material:[e.material])t.userData.gothic3ActorOwned&&n.add(t)});for(let e of t)e.dispose();for(let e of n)e.dispose()}var pr=class{manifest=null;cache=new Map;async loadManifest(){let e=await fetch(Nn(`animated/manifest.json`));if(!e.ok)throw Error(`Animation manifest HTTP `+e.status);let t=await e.json();if(t.version!==1||t.units!==`metres`||!Array.isArray(t.assets))throw Error(`Unsupported native animation manifest`);this.manifest=t}async actor(e){let t=this.manifest?.assets.find(t=>t.id===e);if(!t)return null;let n=this.cache.get(t.glb);n||(n=Promise.all([this.readAsset(t.glb),this.readBytes(t.native).then(e=>JSON.parse(new TextDecoder().decode(e)))]).then(([e,n])=>{let r=new Set(e.animations.map(e=>e.name));for(let e of t.clips)if(!r.has(e.name))throw Error(`GLB does not contain native clip `+e.name);return e.scene.traverse(e=>{if(e instanceof Fe)for(let t of Array.isArray(e.material)?e.material:[e.material]){let e=t.map;e&&(e.anisotropy=8)}}),{object:e.scene,raw:n}}).catch(e=>{throw this.cache.get(t.glb)===n&&this.cache.delete(t.glb),e}),this.cache.set(t.glb,n));let r=await n,i=Be(r.object);i.updateMatrixWorld(!0);try{return i.traverse(e=>{e instanceof xe&&qn(e)}),new dr(i,t,r.raw)}catch(e){throw fr(i),e}}async readAsset(e){let t=await this.readBytes(e);return new Ve().parseAsync(t,new URL(`./`,Nn(e)).href)}async readBytes(e){let t=this.manifest?.outputs[e];if(!t)throw Error(`Animated output not listed: `+e);let n=Nn(e),r=await fetch(n);if(!r.ok)throw Error(`Animated model HTTP `+r.status);let i=await r.arrayBuffer();if(i.byteLength!==t.bytes)throw Error(`Animated model size differs from the manifest`);let a=await crypto.subtle.digest(`SHA-256`,i);if(Array.from(new Uint8Array(a),e=>e.toString(16).padStart(2,`0`)).join(``)!==t.sha256)throw Error(`Animated model hash differs from the manifest`);return i}};async function mr(e,t,n,r){if(e.byteLength!==t)throw Error(`Resource size differs: `+r);let i=await crypto.subtle.digest(`SHA-256`,e);if(Array.from(new Uint8Array(i),e=>e.toString(16).padStart(2,`0`)).join(``)!==n)throw Error(`Resource hash differs: `+r)}async function hr(e,t,n){if(!e.body)throw Error(`Resource response has no body: `+n);let r=e.body.getReader(),i=[],a=0;try{for(;;){let e=await r.read();if(e.done)break;if(a+=e.value.byteLength,a>t)throw await r.cancel(),Error(`Resource exceeds its bounded receipt: `+n);i.push(e.value)}}finally{r.releaseLock()}let o=new Uint8Array(a),s=0;for(let e of i)o.set(e,s),s+=e.byteLength;return o.buffer}async function gr(e,t,n,r={}){if(!Number.isSafeInteger(t.bytes)||t.bytes<0||!/^[a-f0-9]{64}$/.test(t.sha256))throw Error(`Invalid resource receipt: `+e);let i=r.maximumDecodedBytes??4194304;if(!Number.isSafeInteger(i)||i<1||i>67108864)throw Error(`Invalid native resource decode budget: `+e);let a=t.contentEncoding===`gzip`||t.encoding===`gzip`;if(a&&(t.uncompressedBytes===void 0||!Number.isSafeInteger(t.uncompressedBytes)||t.uncompressedBytes<0||t.uncompressedBytes>i||!/^[a-f0-9]{64}$/.test(t.uncompressedSha256??``)))throw Error(`Invalid bounded decoded receipt: `+e);let o=await fetch(Nn(e),{signal:n});if(!o.ok)throw Error(e+` HTTP `+o.status);let s=a&&/\bgzip\b/i.test(o.headers.get(`Content-Encoding`)??``),c=await hr(o,s?Math.max(t.bytes,t.uncompressedBytes):t.bytes,e);if(s&&(c.byteLength!==t.bytes||new Uint8Array(c)[0]!==31||new Uint8Array(c)[1]!==139))return await mr(c,t.uncompressedBytes,t.uncompressedSha256,e+` (HTTP decoded)`),c;if(await mr(c,t.bytes,t.sha256,e),a){if(t.uncompressedBytes===void 0||!t.uncompressedSha256)throw Error(`Decoded resource receipt is missing: `+e);let n=new Blob([c]).stream().pipeThrough(new DecompressionStream(`gzip`)).getReader(),r=[],i=0;try{for(;;){let a=await n.read();if(a.done)break;if(i+=a.value.byteLength,i>t.uncompressedBytes)throw await n.cancel(),Error(`Decoded resource exceeds its receipt: `+e);r.push(a.value)}}finally{n.releaseLock()}let a=new Uint8Array(i),o=0;for(let e of r)a.set(e,o),o+=e.byteLength;c=a.buffer,await mr(c,t.uncompressedBytes,t.uncompressedSha256,e+` (decoded)`)}return c}async function _r(e,t,n={}){return JSON.parse(new TextDecoder().decode(await gr(e,t,void 0,n)))}var vr=[`uv`,`uv1`,`uv2`,`uv3`],yr=[re,ie,o],br=e=>{if(typeof e!=`number`||!Number.isFinite(e))throw Error(`Non-finite native shader constant`);let t=String(e);return/[.e]/i.test(t)?t:t+`.0`},xr=(e,t)=>{if(!Array.isArray(e)||e.length!==t)throw Error(`Native shader vector has wrong size`);return`vec${t}(${e.map(br).join(`,`)})`},Sr=e=>e.width===1?`vec3(${e.code})`:`(${e.code}).rgb`,Cr=e=>e.width===1?e.code:`(${e.code}).r`;function wr(e){let t=new Map(e.nodes.map(e=>[e.id,e]));if(t.size!==e.nodes.length)throw Error(`Duplicate native shader node`);let n=t.get(e.root);if(n?.class!==`eCShaderDefault`||!n.outputs)throw Error(`Unsupported native terrain shader root`);if(n.values.TransformationType!==0||n.values.UseDepthBias!==!1)throw Error(`Unsupported terrain transform/depth bias`);let r=[],i=new Map,a=new Map,o=new Set,s=[],c=new Set,l=0,u=e=>{let n=t.get(e.token);if(!e.valid||!n)throw Error(`Native material input does not resolve: `+e.token);return n},d=(e,t)=>{if(t===0)return e;if(t===1)return e.width===1?{code:`vec3(${e.code})`,width:3}:{code:`(${e.code}).rgb`,width:3};if(t<2||t>5||!Number.isInteger(t))throw Error(`Unknown native color selector`);if(e.width===1)return e;if(t===5&&e.width!==4)throw Error(`Native alpha selector has no alpha input`);return{code:`(${e.code}).${`rgba`[t-2]}`,width:1}},f=(e,t)=>{if(e.width===t.width||t.width===1)return e.width;if(e.width===1)return t.width;throw Error(`Unsupported native mixed RGB/RGBA operation`)},p=(e,t)=>e.width===t?e.code:`vec${t}(${e.code})`,m=e=>{if(!e)throw Error(`Missing native color input`);return d(g(u(e)),e.selector)},h=e=>{if(!e)throw Error(`Missing native coordinate input`);if(!e.valid){if(!Number.isInteger(e.selector)||e.selector<0||e.selector>3)throw Error(`Unsupported native UV selector`);return c.add(e.selector),`vG3UV${e.selector}`}let t=u(e),n=a.get(t.id);if(n)return n;if(o.has(t.id))throw Error(`Cycle in native shader graph`);o.add(t.id);let i;if(t.class===`eCTexCoordSrcScale`)i=`(${h(t.texCoord)} * ${xr(t.values.Scale,2)})`;else if(t.class===`eCTexCoordSrcBumpOffset`){let e=t.inputs?.height;if(!e)throw Error(`Native bump offset lacks height`);let n=m({...e,selector:e.selector<=1?5:e.selector}),r=br(t.values.OffsetAmount);i=`(${h(t.inputs?.texCoord)} + ((${Cr(n)}) - 0.5) * vec2(${r},-${r}) * g3TangentEye)`}else throw Error(`Unsupported native UV node: `+t.class);let s=`g3UV${l++}`;return r.push(`vec2 ${s} = ${i};`),a.set(t.id,s),o.delete(t.id),s},g=e=>{let t=i.get(e.id);if(t)return t;if(o.has(e.id))throw Error(`Cycle in native shader graph`);o.add(e.id);let n;switch(e.class){case`eCColorSrcConstant`:n={code:`vec4(${xr(e.values.Color,3)},${br(e.values.Alpha)})`,width:4};break;case`eCColorSrcVertexColor`:n={code:`vG3Color`,width:4};break;case`eCColorSrcSampler`:{if(!e.textureId||e.selectionStatus?.includes(`unresolved`))throw Error(`Native sampler texture unresolved: `+e.id);if(e.values.AnimationSpeed!==0||e.values.SwitchRepeat!==0)throw Error(`Animated native sampler is not implemented`);let t=yr[Number(e.values.TexRepeatU)],r=yr[Number(e.values.TexRepeatV)];if(t===void 0||r===void 0)throw Error(`Unknown native sampler wrapping`);let i=`g3Texture`+s.length;s.push({name:i,textureId:e.textureId,wrapS:t,wrapT:r}),n={code:`texture2D(${i}, ${h(e.texCoord)})`,width:4};break}case`eCColorSrcCombiner`:{let t=m(e.inputs?.color1),r=m(e.inputs?.color2),i=f(t,r),a=p(t,i),o=p(r,i),s=e.values.CombinerType,c;if(s===0||s===1||s===2)c=`(${a} ${[`+`,`-`,`*`][s]} ${o})`;else if(s===3||s===4)c=`${s===3?`max`:`min`}(${a},${o})`;else throw Error(`Unknown native color combiner`);n={code:c,width:i};break}case`eCColorSrcBlend`:{let t=m(e.inputs?.color1),r=m(e.inputs?.color2),i=m(e.inputs?.blend),a=f(t,r);if(i.width!==1&&i.width!==a)throw Error(`Native blend factor width differs`);n={code:`mix(${p(t,a)},${p(r,a)},${i.code})`,width:a};break}default:throw Error(`Unsupported native color node: `+e.class)}let a=`g3Color${l++}`;return r.push(`${n.width===1?`float`:`vec`+n.width} ${a} = ${n.code};`),n={code:a,width:n.width},i.set(e.id,n),o.delete(e.id),n},_=e=>{let t=n.outputs[e];return t?.valid?m(t):null},v=_(`diffuse`),y=_(`opacity`),ee=_(`normal`),te=n.values.EnableSpecular===!0?_(`specular`):null,ne=te?_(`specularPower`):null,re=_(`selfIllumination`);if(ee&&ee.width!==4)throw Error(`Native AG normal map requires four components`);if(_(`distortion`))throw Error(`Native distortion is not implemented`);return{body:r.join(`
`),diffuse:v?Sr(v):`vec3(1.0)`,opacity:y?Cr(y):null,normal:ee?.code??null,specular:te?Sr(te):null,specularPower:ne?Cr(ne):null,emission:re?Sr(re):null,samplers:s,uvs:[...c].sort(),root:n}}var Tr=class{renderer;textures=new Map;materials=new Map;graphs;textureSources;compiled=new Map;disposed=!1;textureBytes=0;limitations=new Map;constructor(e,t,n){this.renderer=n,this.graphs=new Map(e.map(e=>[e.id,e])),this.textureSources=new Map(t.map(e=>[e.id,e]))}get estimatedTextureBytes(){return this.textureBytes}async acquire(e,t){if(this.disposed)throw Error(`Terrain materials are disposed`);let n=this.compiled.get(e);if(!n){let t=this.graphs.get(e);if(!t)throw Error(`No original terrain graph: `+e);try{n=wr(t),this.compiled.set(e,n)}catch(t){return this.diagnostic(e,String(t))}}for(let r of n.uvs){let n=t.getAttribute(vr[r]);if(!n)return this.diagnostic(e,`Original primitive lacks requested UV`+r);t.setAttribute(`g3UV`+r,n)}for(let n of[`_g3_bgra`,`_g3_tangent`])if(!t.getAttribute(n))return this.diagnostic(e,`Original primitive lacks `+n);let r=this.materials.get(e);r||(r=this.createMaterial(e).catch(t=>{throw this.materials.delete(e),t}),this.materials.set(e,r));let i=await r;if(this.materials.get(e)!==r)return this.acquire(e,t);i.refs++;let a=!1,o=()=>{if(!a&&(a=!0,--i.refs===0)){this.materials.delete(e),i.material.dispose();for(let e of i.textures)this.releaseTexture(e)}};try{if(this.disposed)throw Error(`Terrain material loader disposed during acquisition`)}catch(e){throw o(),e}return{material:i.material,limitation:this.limitations.get(e),release:o}}diagnostic(e,t){let n=e+`: `+t;this.limitations.set(n,n);let r=new Le({color:12798878,side:2});r.name=e+` [unresolved native material]`;let i=!1;return{material:r,limitation:n,release:()=>{i||(i=!0,r.dispose())}}}async texture(e){let t=`${e.textureId}|${e.wrapS}|${e.wrapT}`,n=this.textures.get(t);n||(n=(async()=>{let n=this.textureSources.get(e.textureId);if(!n)throw Error(`Native texture absent from terrain manifest: `+e.textureId);let r=await gr(`terrain/`+n.url,n),i=await createImageBitmap(new Blob([r],{type:`image/png`}),{colorSpaceConversion:`none`,premultiplyAlpha:`none`,imageOrientation:`none`});if(i.width!==n.width||i.height!==n.height||this.disposed)throw i.close(),Error(`Native texture dimensions differ or loader disposed`);let a=new se(i);a.name=e.textureId,a.flipY=!1,a.colorSpace=``,a.wrapS=e.wrapS,a.wrapT=e.wrapT,a.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy()),a.needsUpdate=!0,a.userData.nativeCacheKey=t;let o=Math.ceil(n.width*n.height*4*4/3);return this.textureBytes+=o,{texture:a,bytes:o,refs:0,image:i}})().catch(e=>{throw this.textures.delete(t),e}),this.textures.set(t,n));let r=await n;return this.textures.get(t)===n?(r.refs++,r):this.texture(e)}releaseTexture(e){--e.refs===0&&(this.textures.delete(String(e.texture.userData.nativeCacheKey)),e.texture.dispose(),e.image.close(),this.textureBytes-=e.bytes)}async createMaterial(e){let t=this.graphs.get(e);if(!t)throw Error(`No original terrain graph: `+e);let n=this.compiled.get(e)??wr(t),r=[];try{for(let e of n.samplers)r.push(await this.texture(e));if(this.disposed)throw Error(`Terrain materials disposed during read`);let t=n.root.values.BlendMode;if(t!==0&&t!==1&&t!==2)throw Error(`Unsupported native terrain blend mode`);let i=new a({color:16777215,specular:16777215,side:2,transparent:t===2,depthWrite:t!==2});return i.name=e,i.userData.nativeGraph=e,i.customProgramCacheKey=()=>`gothic3-terrain-graph-v1:`+e,i.onBeforeCompile=e=>{for(let t=0;t<n.samplers.length;t++)e.uniforms[n.samplers[t].name]={value:r[t].texture};let i=`varying vec4 vG3Color;
varying vec3 vG3T;
varying vec3 vG3B;
`+n.uvs.map(e=>`varying vec2 vG3UV${e};`).join(`
`),a=`attribute vec4 _g3_bgra;
attribute vec3 _g3_tangent;
`+n.uvs.map(e=>`attribute vec2 g3UV${e};`).join(`
`);e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
`+i+`
`+a).replace(`#include <begin_vertex>`,`#include <begin_vertex>
vG3Color = _g3_bgra.zyxw / 255.0;
vG3T = normalMatrix * normalize(_g3_tangent);
vG3B = normalMatrix * (cross(normalize(normal), normalize(_g3_tangent)) * (2.0 * (_g3_bgra.z / 255.0) - 1.0));
`+n.uvs.map(e=>`vG3UV${e} = g3UV${e};`).join(`
`));let o=i+`
`+n.samplers.map(e=>`uniform sampler2D ${e.name};`).join(`
`);e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
`+o).replace(`#include <map_fragment>`,`
            vec3 g3Eye = normalize(vViewPosition);
            vec2 g3TangentEye = vec2(dot(g3Eye,vG3T),dot(g3Eye,vG3B));
            ${n.body}
            diffuseColor.rgb *= ${n.diffuse};
            ${n.opacity?`diffuseColor.a *= ${n.opacity};`:``}
            ${t===1?`if (diffuseColor.a <= ${br(Number(n.root.values.MaskReference)/255)}) discard;`:``}
          `),n.normal&&(e.fragmentShader=e.fragmentShader.replace(`#include <normal_fragment_maps>`,`
          vec4 g3NormalMap = (${n.normal} - 0.5) * 2.0;
          vec3 g3MapNormal = vec3(g3NormalMap.a, g3NormalMap.g, sqrt(max(0.0, 1.0 - dot(g3NormalMap.ag,g3NormalMap.ag))));
          normal = normalize(mat3(vG3T,vG3B,vNormal) * g3MapNormal) * faceDirection;
        `)),n.emission&&(e.fragmentShader=e.fragmentShader.replace(`#include <emissivemap_fragment>`,`totalEmissiveRadiance += ${n.emission};`)),e.fragmentShader=e.fragmentShader.replace(`#include <lights_phong_fragment>`,`
          BlinnPhongMaterial material;
          material.diffuseColor = diffuseColor.rgb;
          material.specularColor = ${n.specular??`vec3(0.0)`};
          // Native non-lookup fallback uses power * 127. Three's BRDF and
          // preview lights do not reproduce the original specular lookup.
          material.specularShininess = max(1.0, (${n.specularPower??`0.5`}) * 127.0);
          material.specularStrength = 1.0;
        `),n.root.values.DisableLighting===!0&&(e.fragmentShader=e.fragmentShader.replace(`vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;`,`vec3 outgoingLight = diffuseColor.rgb + totalEmissiveRadiance;`))},{material:i,textures:r,refs:0}}catch(t){for(let e of r)this.releaseTexture(e);throw this.compiled.delete(e),t}}destroy(){this.disposed=!0}},Er=500,Dr=700,Or=48,kr=268435456,Ar=(e,t)=>{let{min:n,max:r}=e.boundsMetres;return Math.hypot(Math.max(n[0]-t.x,0,t.x-r[0]),Math.max(n[2]-t.z,0,t.z-r[2]))},jr=class{renderer;group=new n;loader=new Ve;resident=new Map;pending=new Map;failed=new Map;absolutePosition=new S;origin=new S;source=null;materials=null;queue=[];desired=new Set;lastSelection=0;changed=!1;disposed=!1;initialization=null;initializationFailure=null;constructor(e){this.renderer=e,this.group.name=`Native landscape cells`}initialize(){return this.initialization||=this.readManifest().catch(e=>{throw this.initialization=null,this.initializationFailure=String(e),e}),this.initialization}async readManifest(){let e=await fetch(Nn(`terrain/manifest.json`),{cache:`no-cache`});if(!e.ok)throw Error(`Terrain manifest HTTP `+e.status);let t=await e.json();if(t.schema!==`gothic3-terrain-v1`||!Array.isArray(t.cells)||!t.cells.length||!Array.isArray(t.textures)||t.cells.length!==t.summary.cells||!t.coordinates.legacyArdeaOriginMetres.every(Number.isFinite))throw Error(`Unsupported native terrain manifest`);let n=new Set;for(let e of t.cells){let{min:t,max:r}=e.boundsMetres;if(n.has(e.id)||t.length!==3||r.length!==3||![...t,...r].every(Number.isFinite)||t.some((e,t)=>e>r[t])||!/^cells\/[A-Za-z0-9_.-]+\.glb$/.test(e.geometry.url)||!Number.isSafeInteger(e.geometry.bytes)||e.geometry.bytes>16777216||!Array.isArray(e.primitiveMaterialIds))throw Error(`Invalid native terrain cell`);n.add(e.id)}for(let e of t.textures)if(!/^textures\/[a-f0-9]{64}\.png$/.test(e.url)||!Number.isSafeInteger(e.width)||!Number.isSafeInteger(e.height)||e.width<=0||e.height<=0||e.width>this.renderer.capabilities.maxTextureSize||e.height>this.renderer.capabilities.maxTextureSize)throw Error(`Invalid or unsupported native terrain texture`);if(t.materialGraphs.url!==`material-graphs.json`)throw Error(`Unsupported native material graph path`);let r=await _r(`terrain/`+t.materialGraphs.url,t.materialGraphs);if(r.schema!==`gothic3-terrain-material-graphs-v1`||!Array.isArray(r.materials))throw Error(`Unsupported material graph schema`);this.disposed||(this.origin.fromArray(t.coordinates.legacyArdeaOriginMetres),this.source=t,this.materials=new Tr(r.materials,t.textures,this.renderer),this.initializationFailure=null)}get originMetres(){return this.origin.clone()}get objects(){return[...this.resident.values()].map(e=>e.object)}get manifest(){return this.source}consumeGeometryChange(){let e=this.changed;return this.changed=!1,e}update(e,t,n=!1){if(this.source&&!this.disposed){if(this.absolutePosition.copy(e).add(this.origin),n||t-this.lastSelection>250){this.lastSelection=t;let e=this.source.cells.filter(e=>e.native.registered&&e.native.enabledByAnyRegistry).map(e=>({cell:e,distance:Ar(e,this.absolutePosition)})).filter(e=>e.distance<=Er).sort((e,t)=>e.distance-t.distance||e.cell.id.localeCompare(t.cell.id)).slice(0,Or);this.desired=new Set(e.map(e=>e.cell.id));for(let[e,t]of this.resident)Ar(t.cell,this.absolutePosition)>Dr&&this.evict(e);for(let[e,t]of this.pending)this.desired.has(e)||t.abort();this.queue=e.map(e=>e.cell).filter(e=>!this.resident.has(e.id)&&!this.pending.has(e.id)&&!this.failed.has(e.id)),this.trim()}for(;this.pending.size<2&&this.queue.length;){let e=this.queue[0];if(this.materials.estimatedTextureBytes>=kr&&Ar(e,this.absolutePosition)>30)break;this.queue.shift();let t=new AbortController;this.pending.set(e.id,t),this.load(e,t).then(n=>{if(this.disposed||t.signal.aborted||!this.desired.has(e.id)){this.disposeEntry(n);return}this.resident.set(e.id,n),this.group.add(n.object),n.object.updateMatrixWorld(!0),this.changed=!0,this.trim()}).catch(n=>{!t.signal.aborted&&!this.disposed&&this.failed.set(e.id,e.region+`: `+String(n))}).finally(()=>{this.pending.delete(e.id)})}}}async load(e,t){let n=await gr(`terrain/`+e.geometry.url,e.geometry,t.signal),r=(await this.loader.parseAsync(n,Nn(`terrain/`))).scene,i=[],a=new Set;try{let t=[];if(r.traverse(e=>{if(e instanceof Fe){t.push(e);for(let t of Array.isArray(e.material)?e.material:[e.material])a.add(t)}}),!t.length)throw Error(`Native landscape cell has no primitives`);for(let n of t){let t=Array.isArray(n.material)?n.material:[n.material],r=[];for(let a of t){let t=a.userData.nativeMaterialId;if(!t||!e.primitiveMaterialIds.includes(t))throw Error(`Native primitive material differs from receipt`);let o=await this.materials.acquire(t,n.geometry);i.push(o),r.push(o.material)}n.material=Array.isArray(n.material)?r:r[0],n.userData.kind=`terrain`}return r.position.sub(this.origin),r.name=e.id,r.userData.nativeCell=e,{cell:e,object:r,leases:i}}catch(t){throw this.disposeEntry({cell:e,object:r,leases:i}),t}finally{for(let e of a)e.dispose()}}trim(){if(!this.materials)return;let e=[...this.resident.values()].sort((e,t)=>Ar(t.cell,this.absolutePosition)-Ar(e.cell,this.absolutePosition));for(let t of e){if(this.resident.size<=Or&&this.materials.estimatedTextureBytes<=kr)break;Ar(t.cell,this.absolutePosition)<30||this.evict(t.cell.id)}}evict(e){let t=this.resident.get(e);t&&(this.resident.delete(e),this.group.remove(t.object),this.disposeEntry(t),this.changed=!0)}disposeEntry(e){for(let t of e.leases)t.release();let t=new Set;e.object.traverse(e=>{e instanceof Fe&&t.add(e.geometry)});for(let e of t)e.dispose()}hasGroundAt(e){let t=e.clone().add(this.origin),n=this.source?.cells.filter(e=>e.native.registered&&e.native.enabledByAnyRegistry&&Ar(e,t)<=.5)??[];return n.length>0&&n.every(e=>this.resident.has(e.id))}status(){let e=[...this.resident.values()].sort((e,t)=>Ar(e.cell,this.absolutePosition)-Ar(t.cell,this.absolutePosition))[0];return{ready:this.source!==null,cells:this.resident.size,total:this.source?.summary.cells??0,triangles:[...this.resident.values()].reduce((e,t)=>e+t.cell.geometry.triangles,0),downloading:this.pending.size,queued:this.queue.length,estimatedTextureBytes:this.materials?.estimatedTextureBytes??0,region:e?.cell.region??null,groundReady:this.hasGroundAt(this.absolutePosition.clone().sub(this.origin)),failures:[...this.initializationFailure?[this.initializationFailure]:[],...this.failed.values(),...this.materials?.limitations.values()??[]]}}retry(){this.failed.clear(),this.lastSelection=-1/0,this.source||this.initialize().catch(()=>{})}destroy(){if(!this.disposed){this.disposed=!0;for(let e of this.pending.values())e.abort();for(let e of this.resident.keys())this.evict(e);this.queue=[],this.materials?.destroy()}}},Mr=new class{budgetBytes;pending=null;receipts=new Map;cache=new Map;heldBytes=0;constructor(e=33554432){this.budgetBytes=e}manifest(){return this.pending||=this.readManifest().catch(e=>{throw this.pending=null,e}),this.pending}async readManifest(){let e=await fetch(Nn(`gameplay/manifest.json`),{cache:`no-cache`});if(!e.ok)throw Error(`Gameplay manifest HTTP `+e.status);let t=await e.json();if(t.schema!==`gothic3-gameplay-v1`||!Array.isArray(t.outputs)||!t.world||!t.templates||!t.initial||!t.localization)throw Error(`Unsupported native gameplay manifest`);let n=new Map;for(let e of t.outputs){if(!/^[A-Za-z0-9_/-]+\.json(?:\.gz)?$/.test(e.path)||e.path.includes(`..`)||n.has(e.path)||!Number.isSafeInteger(e.bytes)||e.bytes<0||!/^[a-f0-9]{64}$/.test(e.sha256))throw Error(`Invalid native output receipt`);n.set(e.path,e)}return this.receipts=n,t}async read(e){await this.manifest();let t=this.receipts.get(e);if(!t)throw Error(`Native output is not listed: `+e);let n=this.cache.get(e);if(n)return this.cache.delete(e),this.cache.set(e,n),await n.promise;let r={promise:Promise.resolve(null),decodedBytes:t.uncompressedBytes??t.bytes,complete:!1};return r.promise=_r(`gameplay/`+e,t).then(t=>(this.cache.get(e)===r&&(r.complete=!0,this.heldBytes+=r.decodedBytes,this.trim()),t)).catch(t=>{throw this.cache.get(e)===r&&this.cache.delete(e),t}),this.cache.set(e,r),await r.promise}trim(){for(let[e,t]of this.cache){if(this.heldBytes<=this.budgetBytes)break;t.complete&&(this.cache.delete(e),this.heldBytes-=t.decodedBytes)}}get retainedDecodedBytes(){return this.heldBytes}};function Nr(e,t){return e.length?e.length>1?{kind:`ambiguous`,candidates:e}:{kind:`found`,value:e[0]}:{kind:`missing`,reason:`No source match: `+t}}var Pr=class{resources;filesPending=null;templatesPending=null;constructor(e=Mr){this.resources=e}sourceFiles(){return this.filesPending||=this.readSourceFiles().catch(e=>{throw this.filesPending=null,e}),this.filesPending}async readSourceFiles(){let e=await this.resources.manifest(),t=await this.resources.read(e.world.files);if(!Array.isArray(t)||new Set(t.map(e=>e.index)).size!==t.length||t.some(e=>!Number.isSafeInteger(e.index)||e.index<0||!e.source?.path))throw Error(`Invalid native world file directory`);return t}async sourceByPath(e){return Nr((await this.sourceFiles()).filter(t=>t.source.path===e),e)}async descriptor(e){let t=(await this.sourceFiles()).find(t=>t.index===e);if(!t?.url)throw Error(`Native world source is undecoded or absent: `+e);let n=await this.resources.read(t.url);if(n.schema!==`gothic3-entity-chunks-v1`||n.source.sha256!==t.source.sha256||!Array.isArray(n.chunks)||!Array.isArray(n.indexChunks))throw Error(`Native world descriptor differs: `+e);return n}async entityIndex(e){let t=await this.descriptor(e),n=[];for(let r of t.indexChunks){let t=await this.resources.read(r.url);if(!Array.isArray(t.entities)||t.entities.length!==r.entities||t.entities.some(t=>t.file!==e||!t.key))throw Error(`Native entity index differs: `+r.url);n.push(...t.entities)}let r=(await this.sourceFiles()).find(t=>t.index===e);if(n.length!==r.entities)throw Error(`Native entity count differs: `+e);return n}async entitiesNamed(e,t){let n=new Set(t);if(t.some(e=>typeof e!=`string`||e.length===0)||n.size!==t.length)throw Error(`Native entity-name query must contain unique nonempty names`);let r=await this.descriptor(e),i=new Map;for(let e of t)i.set(e,[]);let a=0;for(let t of r.indexChunks){let r=await this.resources.read(t.url);if(!Array.isArray(r.entities)||r.entities.length!==t.entities||r.entities.some(t=>t.file!==e||!t.key))throw Error(`Native entity index differs: `+t.url);a+=r.entities.length;for(let e of r.entities)n.has(e.name)&&i.get(e.name).push(e)}let o=(await this.sourceFiles()).find(t=>t.index===e);if(!o?.entities||a!==o.entities)throw Error(`Native entity count differs: `+e);return i}async entity(e){if(!e.dataChunk)return{kind:`missing`,reason:`Selected gameplay properties are absent: `+e.key};let t=await this.resources.read(e.dataChunk);if(!Array.isArray(t.entities))throw Error(`Native entity chunk is invalid: `+e.dataChunk);return Nr(t.entities.filter(t=>t.key===e.key&&t.guid===e.guid),e.key)}templateIndex(){return this.templatesPending||=this.readTemplateIndex().catch(e=>{throw this.templatesPending=null,e}),this.templatesPending}async readTemplateIndex(){let e=await this.resources.manifest(),t=await this.resources.read(e.templates.index);if(t.schema!==`gothic3-template-index-chunks-v1`||!Array.isArray(t.chunks))throw Error(`Unsupported template index`);let n=[];for(let e of t.chunks){let t=await this.resources.read(e.url);if(!Array.isArray(t.headers)||t.headers.length!==e.headers)throw Error(`Template index chunk differs`);n.push(...t.headers)}if(n.length!==t.headerCount||new Set(n.map(e=>e.file+`:`+e.header)).size!==n.length)throw Error(`Template index count or identities differ`);return n}async templateByGuid(e){return Nr((await this.templateIndex()).filter(t=>t.guid===e),e)}async templateByName(e,t=!1){return Nr((await this.templateIndex()).filter(n=>n.name===e&&(t||!n.helperParent)),e)}async template(e){let t=await this.resources.read(e.dataChunk);if(!Array.isArray(t.entities))throw Error(`Native template chunk is invalid`);return Nr(t.entities.filter(t=>t.index===e.header&&t.guid===e.guid),e.name)}},Fr=[{name:`Ardea`,region:`Myrtana`,sourceName:`Hamlar`,key:`world-2419:26817`,guid:`2da6e6d0b7884a44a2bd7f9749379cc400000000`,chunk:`world/entity-chunks/2419-0096.json.gz`},{name:`Xardas’s tower`,region:`Nordmar`,sourceName:`Xardas`,key:`world-2419:8291`,guid:`77d7a2d399cef544a8aa96093f0ae40700000000`,chunk:`world/entity-chunks/2419-0030.json.gz`},{name:`Lago`,region:`Varant`,sourceName:`Vatras`,key:`world-2419:6850`,guid:`d05b9deb6b8e3f4c8a025597a7a10c8200000000`,chunk:`world/entity-chunks/2419-0024.json.gz`}];async function Ir(){return Promise.all(Fr.map(async e=>{let t=(await Mr.read(e.chunk)).entities.filter(t=>t.key===e.key&&t.guid===e.guid&&t.name===e.sourceName),n=t[0]?.worldMatrix;if(t.length!==1||!Array.isArray(n)||n.length!==16||!n.every(Number.isFinite))throw Error(`Original landscape destination does not resolve: `+e.name);return{name:e.name,region:e.region,position:[n[12]/100,n[13]/100,-n[14]/100]}}))}var Lr=`{"schema":"gothic3-initial-quests-output-v1","output":{"path":"initial-quests.json","bytes":475077,"sha256":"1ad6940998af6119a833ef27f5e0ea46687610e52bec2640d21ad4635b81e518"},"questCount":641,"runtimePacketCount":637,"details":{"path":"assets/gothic3/dialogue/initial-quests-receipt.json","sha256":"19a440b2841c479fbadc824cfbbb206375aff0fddd9bd8abded00ae917467e2c"}}\r
`,Rr=function(e){return e[e.Open=0]=`Open`,e[e.Running=1]=`Running`,e[e.Success=2]=`Success`,e[e.Failed=3]=`Failed`,e[e.Obsolete=4]=`Obsolete`,e[e.Cancelled=5]=`Cancelled`,e[e.Lost=6]=`Lost`,e[e.Won=7]=`Won`,e}({}),zr=class{host;definitions;states=new Map;constructor(e,t){this.host=t,this.definitions=new Map(e.map(e=>[e.id,e]))}seed(e,t){let n=this.definitions.get(e);if(!n||!Number.isInteger(t.status)||t.status<0||t.status>7||t.counters.length!==n.deliveryTargets.length||!t.counters.every(e=>Number.isInteger(e)&&e>=0))throw Error(`Invalid source quest state: `+e);this.states.set(e,structuredClone(t))}state(e){let t=this.states.get(e);return t?structuredClone(t):void 0}appendDialogueLogPairs(e,t){if(t.length===0)return{kind:`applied`};let n=this.definitions.get(e),r=this.states.get(e);return!n||!r?{kind:`unsupported`,reason:`Original quest state has not been seeded: `+e}:t.some(e=>!Number.isInteger(e.version)||e.version<0||e.version>65535||typeof e.speakerKey!=`string`||typeof e.textKey!=`string`||e.speakerKey.includes(`\0`)||e.textKey.includes(`\0`))?{kind:`unsupported`,reason:`Native dialogue log localization pair is malformed.`}:(r.logPairs??=[],r.logPairs.push(...t.map(e=>({...e}))),r.logKeys.push(...t.map(e=>e.textKey).filter(Boolean)),this.host.changed(n,r.status,structuredClone(r)),{kind:`applied`})}run(e){return this.states.get(e)?.status===0?this.setStatus(e,1):{kind:`rejected`,reason:`RunQuest requires an existing Open quest.`}}succeed(e){let t=this.states.get(e)?.status;return t!==0&&t!==1?{kind:`rejected`,reason:`SucceedQuest requires an Open or Running quest.`}:this.setStatus(e,2)}close(e){return this.setStatus(e,this.states.get(e)?.status===0?4:5)}prerequisitesFinished(e){let t=this.definitions.get(e);if(!t)return null;for(let e of t.prereqs){if(!this.definitions.has(e))continue;let t=this.states.get(e)?.status;if(t===void 0)return null;if(t===0||t===1||t===6)return!1}return!0}setStatus(e,t){let n=this.definitions.get(e),r=this.states.get(e);if(!n||!r)return{kind:`unsupported`,reason:`Original quest state has not been seeded: `+e};let i=r.status;if(!(t===1?i===0||i===6:t===2||t===7||t===3?i===0||i===1:t===4?i===0:(t===5||t===6)&&i===1))return{kind:`rejected`,reason:`Native quest transition rejects `+i+` → `+t};let a=r.startedAt;if(t===1&&(a=this.host.clock(),!a))return{kind:`unsupported`,reason:`Native world clock is unavailable.`};let o=[];if(t===2||t===7){let e=n.rewards;if(e.experience===null||e.political?.amount===null||e.enclave?.amount===null||e.attribute?.amount===null)return{kind:`unsupported`,reason:`Native reward fields are unresolved.`};if(e.political&&e.political.amount!==null&&e.political.amount>0){if(e.political.alignment===null)return{kind:`unsupported`,reason:`Political alignment is unresolved.`};o.push({type:`politicalFame`,alignment:e.political.alignment,amount:e.political.amount})}e.attribute?.id&&e.attribute.amount!==null&&o.push({type:`attributeBase`,id:e.attribute.id,amount:e.attribute.amount}),e.enclave&&e.enclave.amount!==null&&e.enclave.amount>0&&o.push({type:`enclaveFame`,name:e.enclave.name,amount:e.enclave.amount}),e.experience!==0&&o.push({type:`experienceScript`,requestedAmount:e.experience,self:`world`,other:`player`}),n.id.toLowerCase()===`ardea_revolution`&&o.push({type:`afterArdeaTutorial`,tutorial:8,textKey:`TUT_AfterFight`})}(n.numericType===5||n.numericType===12)&&o.push({type:`arenaStatus`,arena:n.destination,running:t===1});let s=this.host.apply(o);return s.applied?(r.status=t,r.startedAt=a,this.host.changed(n,i,structuredClone(r)),{kind:`applied`}):{kind:`unsupported`,reason:s.reason}}},Br=JSON.parse(`{"schema":"gothic3-info-state-output-v1","output":{"path":"info-state/initial-info-state.json","bytes":14790,"sha256":"5b82a1445ad78a978ec62117827c2d2b3826f0f6e76e6de816ffcc816057a403"},"providers":[{"path":"info-state/providers/ini.json","bytes":2120458,"sha256":"6d776164fd2ea72666f9491419b1e9c9cb5738cf9c0bfd612a9fa5d9134308e7","id":"ini","infoCount":4381,"kind":"fresh-factory-and-INI","audit":{"sourceGiven":{"false":4381},"sourcePermanent":{"false":4076,"true":197,"none":108},"effectiveGivenTrue":0,"effectivePermanentTrue":197}},{"path":"info-state/providers/compiled-pak.json","bytes":1336300,"sha256":"cbc9284199fd29fee7be3033447b5a0e503756dba9bdb31f6d9d6b765b9bf86a","id":"compiled-pak","infoCount":4260,"kind":"historical-compiled-static","audit":{"sourceGiven":{"false":4260},"sourcePermanent":{"false":4117,"true":143},"effectiveGivenTrue":0,"effectivePermanentTrue":143,"fileVersion":1,"stringCount":19454,"objectStreamEnd":3130609,"stringTableOffset":3130613,"consumedBytes":3596427}},{"path":"info-state/providers/compiled-p00.json","bytes":1337880,"sha256":"445ee726ef9997e9f5cf444e5cc79663fc5ce62acadd17f9308315a742bded91","id":"compiled-p00","infoCount":4265,"kind":"historical-compiled-static","audit":{"sourceGiven":{"false":4265},"sourcePermanent":{"false":4122,"true":143},"effectiveGivenTrue":0,"effectivePermanentTrue":143,"fileVersion":1,"stringCount":19458,"objectStreamEnd":3135168,"stringTableOffset":3135172,"consumedBytes":3600931}}],"details":{"path":"assets/gothic3/info-state/native-evidence.json","bytes":409218,"sha256":"deb46505a67f32c5e295c41091ae1988bcfcb795085f74e536435ea2ae169612"},"scope":"ordinary-world-read-before-OnGameStartUp","reproductionSources":[{"path":"tools/gothic3/research_info_runtime.py","bytes":30427,"sha256":"458eb7d3fdf39e10178338752eef357a1363b07cda633e627db9b42d69fceba8"},{"path":"tools/gothic3/read_info_defaults_evidence.py","bytes":16051,"sha256":"5fb7d8770501333f4ddb4c86504788a7ff2d7e7869fa8f65e875bde78968ac40"},{"path":"tools/gothic3/read_gameplay_ini.py","bytes":2609,"sha256":"c74ed30f3562fc06cb915a8a80f7e68d5b3997384fb4bd19b136b56ad1e0f410"},{"path":"tools/gothic3/read_gameplay_properties.py","bytes":42309,"sha256":"8f08c332ddef351d0187390717c020ffaf5d4b5909697d2cb37f94ed673e3484"},{"path":"tools/gothic3/read_genome.py","bytes":6073,"sha256":"5fa6fdf206583601cf07365429f4fcd468cc59905e8afe1f334161028ffc6f62"}],"reproduction":"python -B tools/gothic3/research_info_runtime.py --study <LOCAL_DESKTOP_STUDY> --installation <LOCAL_GOTHIC3_INSTALLATION>"}\r
`),Vr=e=>typeof e==`string`&&/^[a-f0-9]{64}$/.test(e),Hr=e=>typeof e==`number`&&Number.isSafeInteger(e)&&e>=0,Ur=e=>e===null||typeof e==`boolean`,Wr=[`ini`,`compiled-pak`,`compiled-p00`],Gr=null,Kr=new Map;function qr(e){if(Br.schema!==`gothic3-info-state-output-v1`||e.schema!==`gothic3-initial-info-state-v1`||e.scope!==`ordinary-world-read-before-OnGameStartUp`||e.worldManager?.entityKey!==`world-2419:1`||e.worldManager.classVersion!==4||e.worldManager.runtimeTailBytes!==0||e.worldManager.ordinaryReadRuntimePacketCount!==0||!Vr(e.worldManager.sha256)||e.staticSelection?.status!==`context-required`||e.staticSelection.selectedProvider!==null||!Array.isArray(e.providers)||e.providers.length!==3||!Array.isArray(e.unapplied)||!e.unapplied.every(e=>typeof e==`string`))throw Error(`Invalid original InfoManager state document`);let t=new Set;for(let n of e.providers){let e=Br.providers.find(e=>e.id===n.id);if(!Wr.includes(n.id)||t.has(n.id)||!e||n.path!==e.path||n.bytes!==e.bytes||n.sha256!==e.sha256||n.infoCount!==e.infoCount||n.kind!==e.kind)throw Error(`Invalid original info provider receipt`);t.add(n.id)}let n=e.browserProfile;if(!n||n.id!==`fresh-original-G3_World_01-INI`||n.worldName!==`G3_World_01`||n.entityPatchingEnabled!==!0||n.compiledProjectFolder!==!0||n.compiledInfoLookup!==`missing`||n.noInfosSkip!==!1||n.nativeRuntimeCaptured!==!1||!Array.isArray(n.assumptions)||!n.assumptions.every(e=>typeof e==`string`))throw Error(`Invalid explicit browser InfoManager profile`)}async function Jr(){return Gr||=_r(Br.output.path,Br.output).then(e=>(qr(e),e)).catch(e=>{throw Gr=null,e}),structuredClone(await Gr)}async function Yr(e){let t=Kr.get(e);return t||(t=(async()=>{let t=(await Jr()).providers.find(t=>t.id===e);if(!t)throw Error(`Original info provider is absent: `+e);let n=await _r(t.path,t);if(n.schema!==`gothic3-info-provider-v1`||n.id!==e||n.kind!==t.kind||n.infoCount!==t.infoCount||!Array.isArray(n.records)||n.records.length!==n.infoCount||!Array.isArray(n.sources))throw Error(`Invalid original info provider: `+e);for(let t of n.sources)if(!t||!t.archive||!t.path||!Vr(t.sha256)||typeof t.selection!=`string`)throw Error(`Invalid original info source: `+e);let r=new Set,i=0,a=0;for(let t of n.records){if(!t.id||r.has(t.id)||!Hr(t.sourceIndex)||!n.sources[t.sourceIndex]||!Ur(t.sourceGiven)||!Ur(t.sourcePermanent)||typeof t.given!=`boolean`||typeof t.permanent!=`boolean`||t.given!==(t.sourceGiven??!1)||t.permanent!==(t.sourcePermanent??!1)||(t.sourceGiven===null?t.givenInitialization!==`fresh-factory-default`:t.givenInitialization!==(e===`ini`?`explicit-ini`:`compiled-static-property`))||(t.sourcePermanent===null?t.permanentInitialization!==`fresh-factory-default`:t.permanentInitialization!==(e===`ini`?`explicit-ini`:`compiled-static-property`)))throw Error(`Invalid original info initialization: `+t.id);r.add(t.id),i+=Number(t.given),a+=Number(t.permanent)}if(n.audit?.effectiveGivenTrue!==i||n.audit?.effectivePermanentTrue!==a)throw Error(`Original info flags differ from audited counts`);return n})().catch(t=>{throw Kr.delete(e),t}),Kr.set(e,t)),structuredClone(await t)}function Xr(e){if(!e.worldName.known)return{kind:`unknown`,reason:e.worldName.reason};if(e.worldName.value!==`G3_World_01`)return{kind:`unknown`,reason:`This source state covers G3_World_01 only.`};if(!e.entityPatchingEnabled.known)return{kind:`unknown`,reason:e.entityPatchingEnabled.reason};if(!e.entityPatchingEnabled.value)return{kind:`unknown`,reason:`Patching-disabled Read does not establish this fresh static table.`};let t=e.compiledProjectFolder,n=e.compiledInfoLookup;return t.known&&t.value&&n.known&&(n.value===`compiled-pak`||n.value===`compiled-p00`)?{kind:`provider`,provider:n.value,route:`Original compiled static property-object read; historical provider membership retained.`}:t.known&&!t.value||n.known&&n.value===`missing`?e.noInfosSkip.known?e.noInfosSkip.value?{kind:`unknown`,reason:`Native noinfos option suppresses the INI loader; this catalog is not its runtime table.`}:{kind:`provider`,provider:`ini`,route:`Fresh native INI instances; compiled flag false or compiled lookup known missing.`}:{kind:`unknown`,reason:e.noInfosSkip.reason}:{kind:`unknown`,reason:`Compiled provider success/failure is not established for this initial read.`}}var Zr=class e{provider;route;unapplied;records=new Map;current=new Map;invalidatedReason=null;constructor(e,t,n){this.provider=e,this.route=t,this.unapplied=n;for(let t of e.records)this.records.set(t.id,t),this.current.set(t.id,t.given)}static async fromInitialRead(t,n){qr(t);let r=Xr(n);if(r.kind===`unknown`)return{known:!1,reason:r.reason};let i=await Yr(r.provider);return{known:!0,value:new e(i,r.route,[...t.unapplied])}}get providerId(){return this.provider.id}source(e){let t=this.records.get(e),n=t?this.provider.sources[t.sourceIndex]:void 0;return t&&n?structuredClone({...t,source:n}):void 0}given(e){if(this.invalidatedReason)return{known:!1,reason:this.invalidatedReason};let t=this.records.get(e.id);if(!t)return{known:!1,reason:`Info does not belong to this original provider: `+e.id};let n=this.provider.sources[t.sourceIndex];return n?e.source.sha256!==n.sha256||e.source.archive!==n.archive||e.source.path!==n.path?{known:!1,reason:`Info definition differs from this provider source: `+e.id}:{known:!0,value:this.current.get(e.id)}:{known:!1,reason:`Original info source is absent: `+e.id}}markGiven(e){let t=this.given(e);if(!t.known)throw Error(t.reason);this.current.set(e.id,!0)}currentGivenIds(){if(this.invalidatedReason)throw Error(this.invalidatedReason);return[...this.current].filter(([,e])=>e).map(([e])=>e).sort()}restoreGivenIds(e){if(this.invalidatedReason)throw Error(this.invalidatedReason);if(!Array.isArray(e)||e.some(e=>typeof e!=`string`)||new Set(e).size!==e.length)throw Error(`Browser save has invalid or duplicate InfoManager Given IDs.`);for(let t of e)if(!this.records.has(t))throw Error(`Browser save refers to an Info absent from this source provider: `+t);for(let t of e)this.current.set(t,!0)}invalidateForUnsupportedRestore(e){if(!e.trim())throw Error(`Info state invalidation needs a reason`);this.invalidatedReason=e}snapshot(){return{provider:this.provider.id,scope:`ordinary-world-read-before-OnGameStartUp`,route:this.route,valid:this.invalidatedReason===null,invalidatedReason:this.invalidatedReason,unapplied:[...this.unapplied],records:[...this.records.values()].map(e=>{let t=this.provider.sources[e.sourceIndex];if(!t)throw Error(`Original info source is absent: `+e.id);return structuredClone({...e,source:t,currentGiven:this.current.get(e.id)})})}}};async function Qr(){let e=await Jr(),t=e.browserProfile,n=await Zr.fromInitialRead(e,{worldName:{known:!0,value:t.worldName},entityPatchingEnabled:{known:!0,value:t.entityPatchingEnabled},compiledProjectFolder:{known:!0,value:t.compiledProjectFolder},compiledInfoLookup:{known:!0,value:t.compiledInfoLookup},noInfosSkip:{known:!0,value:t.noInfosSkip}});if(!n.known)throw Error(n.reason);return n.value}var $r=e=>typeof e==`number`&&Number.isInteger(e)&&e>=-2147483648&&e<=2147483647,ei=e=>typeof e==`number`&&Number.isInteger(e)&&e>=0&&e<=4294967295,ti=e=>typeof e==`string`&&/^[a-f0-9]{40}$/.test(e),ni=e=>typeof e==`string`&&/^[a-f0-9]{64}$/.test(e);function ri(e){if(e.schema!==`gothic3-initialized-player-v1`||e.schemaVersion!==1||e.player?.name!==`PC_Hero`||!ti(e.player.guid)||!ni(e.player.source?.sha256)||!Array.isArray(e.player.worldMatrix)||e.player.worldMatrix.length!==16||!e.player.worldMatrix.every(Number.isFinite)||!Array.isArray(e.player.localMatrix)||e.player.localMatrix.length!==16||!e.player.localMatrix.every(Number.isFinite)||!e.memory||!e.serialized?.npc)throw Error(`Invalid source player seed`);for(let t of[`XP`,`LPAttribs`,`LPPerks`,`Chapter`])if(!$r(e.memory[t]))throw Error(`Unresolved source player-memory number: `+t);if(!ei(e.serialized.npc.Level))throw Error(`Unresolved original player NPC Level`);let t=e.memory.PlayerKnows;if(!t||t.prefix!==1||t.elementType!==`class bCString`||!Array.isArray(t.items)||t.count!==t.items.length||t.items.some(e=>typeof e!=`string`))throw Error(`Invalid original player-memory game-event array`);for(let t of[e.stats?.hitPoints,e.stats?.manaPoints,e.stats?.staminaPoints])if(!t||!$r(t.current)||!$r(t.max))throw Error(`Invalid initialized player stat`);if(!Array.isArray(e.inventory?.stacks)||e.inventory.stacks.length!==121||e.inventory.assuranceCount!==e.inventory.stacks.length||e.inventory.serializedStackCount!==0||!Array.isArray(e.inventory.equipment)||e.inventory.equipment.length!==2||Object.keys(e.templateDefinitions??{}).length!==123)throw Error(`Player inventory count differs from native assurance proof`);let n=new Set;for(let[t,r]of e.inventory.stacks.entries()){if(r.index!==t||!r.templateName||n.has(r.templateGuid20)||!ti(r.templateGuid20)||!ei(r.amount)||!ei(r.quality)||!ei(r.hotKeyUnsigned)||r.quickSlot!==null&&!ei(r.quickSlot)||r.learned!==null&&typeof r.learned!=`boolean`||!e.templateDefinitions[r.templateGuid20])throw Error(`Invalid native-assured inventory stack: `+t);n.add(r.templateGuid20)}let r=new Set;for(let t of e.inventory.equipment){if(!ei(t.slotIndex)||r.has(t.slotIndex)||t.slot?.value!==t.slotIndex||!ti(t.templateGuid20)||!ti(t.itemGuid20)||t.status!==`serialized-equipped-slot`||!e.templateDefinitions[t.templateGuid20])throw Error(`Invalid original equipment slot`);r.add(t.slotIndex)}if(!Array.isArray(e.unsupportedCallbacks)||!Array.isArray(e.limitations)||e.limitations.some(e=>typeof e!=`string`)||!Array.isArray(e.nativeStartup?.explicitQuestRuns))throw Error(`Player initialization scope is missing`)}async function ii(){let e=await Mr.manifest(),t=e.initial.initializedPlayer;if(typeof t!=`string`||t.length===0)throw Error(`Original initialized Hero source path is unavailable.`);let n=e.outputs.find(e=>e.path===t);if(!n||!ni(n.sha256))throw Error(`Original initialized Hero source receipt is unavailable.`);let r=await Mr.read(t);ri(r);let i=r.inventory.stacks.filter(e=>e.templateName===`It_Perk_Learn`);if(i.length!==1||i[0]?.index!==75)throw Error(`Original Perk_Learn inventory stack identity differs.`);let a=await fetch(Nn(`inventory/manifest.json`),{cache:`no-cache`});if(!a.ok)throw Error(`Native starting-inventory manifest HTTP `+a.status);let o=await a.json(),s=new Map([[`Game`,`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`],[`Script`,`9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08`],[`SharedBase`,`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`]]);if(o.schema!==`gothic3-native-inventory-manifest-v1`||o.schemaVersion!==1||o.startingInventory!==`starting-inventory.json`||o.inputs.length!==s.size||o.inputs.some(e=>s.get(e.module)!==e.sha256))throw Error(`Native starting-inventory evidence profile differs from the installed Hero source build.`);let c=o.outputs.find(e=>e.url===o.startingInventory);if(!c)throw Error(`Hash-checked starting-inventory output receipt is unavailable.`);let l=await _r(`inventory/`+o.startingInventory,c),u=l.stacks.find(e=>e.templateName===`It_Perk_Learn`),d=i[0],f=d.startupOperation;if(l.schema!==`gothic3-native-starting-inventory-v1`||l.schemaVersion!==1||l.scope!==`intrinsic-stack-state-before-external-inventory-observers-and-later-startup-equipping`||l.sourceSeed.sha256!==n.sha256||l.sourceSeed.bytes!==n.bytes||l.stacks.length!==121||!u||u.index!==75||u.activationCount!==0||u.intrinsicLearned!==!1||u.learnedOperation!==`preserve`||u.startupOperation.finalBoolean!==!1||d.nativeNewStackDefaultLearned!==!1||d.learned!==null||d.learnedOperation!==`preserve`||f?.finalBoolean!==!1)throw Error(`Original Perk_Learn stack state cannot be proven from the empty-list startup and inventory receipts.`);let p=Object.freeze({status:`known`,value:u.intrinsicLearned||u.activationCount>0,source:`inventory/starting-inventory.json#stacks[75]+Game:201ae890+Script_Game:100628c0`});return Object.freeze({source:Object.freeze({path:t,sha256:n.sha256}),xp:r.memory.XP,lpAttribs:r.memory.LPAttribs,level:r.serialized.npc.Level,learnPerkActive:Object.freeze(p)})}function ai(e,t){if(e.schema!==`gothic3-world-clock-v1`||e.schemaVersion!==1||e.source?.sha256!==t.player.source.sha256||!e.selectedEntityKey||!Number.isFinite(e.factor)||!e.calendar||![`year`,`day`,`hour`,`minute`,`second`].every(t=>ei(e.calendar[t]))||e.calendar.hour>=24||e.calendar.minute>=60||e.calendar.second>=60)throw Error(`Invalid source world clock`)}function oi(e,t,n,r){if(n.schema!==`gothic3-initial-quests-output-v1`||n.questCount!==641||n.runtimePacketCount!==637||e.schema!==`gothic3-initial-quests-v1`||e.scope!==`original-world-state-before-OnGameStartUp`||e.questCount!==n.questCount||e.runtimePacketCount!==n.runtimePacketCount||!Array.isArray(e.quests)||e.quests.length!==t.length||t.length!==641||e.runtimeSource?.sha256!==r.source.sha256||e.runtimeSource.entityKey!==r.selectedEntityKey||e.runtimeSource.runtimePacketCount!==637||!ei(e.runtimeSource.runtimeTailOffset)||!ei(e.runtimeSource.runtimeTailBytes)||e.startup?.applied!==!1||!Array.isArray(e.startup.explicitQuestRuns)||!Array.isArray(e.startup.unimplemented)||e.startup.unimplemented.some(e=>typeof e!=`string`)||typeof e.startup.evidenceLimit!=`string`)throw Error(`Invalid original quest initialization document`);let i=new Map(t.map(e=>[e.id,e]));if(i.size!==641)throw Error(`Duplicate original quest definitions`);let a=new Set,o=new Set,s=0;for(let t of e.quests){let n=i.get(t.id);if(!n||a.has(t.id)||t.definitionSource?.sha256!==n.source.sha256||t.status!==Rr.Open||!Array.isArray(t.counters)||t.counters.length!==n.deliveryTargets.length||!t.counters.every(e=>e===0)||!t.startedAt||t.startedAt.years!==0||t.startedAt.days!==0||t.startedAt.hours!==0||!Array.isArray(t.logKeys)||!t.logKeys.every(e=>typeof e==`string`)||!Array.isArray(t.logPairs))throw Error(`Original quest seed differs from source definition: `+t.id);a.add(t.id);for(let e of t.logPairs)if(e.version!==1||typeof e.speakerKey!=`string`||typeof e.textKey!=`string`)throw Error(`Invalid original quest log pair`);if(JSON.stringify(t.logKeys)!==JSON.stringify(t.logPairs.map(e=>e.textKey).filter(Boolean)))throw Error(`Original quest log keys lost pair information: `+t.id);let r=t.initialization;if(!r)throw Error(`Quest initialization route is missing`);if(r.kind===`compiled-runtime-overlay`){if(!ei(r.packetIndex)||r.packetIndex>=637||o.has(r.packetIndex)||r.packetVersion!==3||r.sourceSha256!==e.runtimeSource.sha256||!ei(r.packetOffset)||!ei(r.packetLength)||!ni(r.packetSha256)||r.packetOffset<e.runtimeSource.runtimeTailOffset||r.packetOffset+r.packetLength>e.runtimeSource.runtimeTailOffset+e.runtimeSource.runtimeTailBytes)throw Error(`Invalid original quest runtime packet: `+t.id);o.add(r.packetIndex)}else if(r.kind===`fresh-factory-and-INI`){if(![`Mort_GuideFireAgain`,`Mort_GuideMineAgain`,`Mort_GuideWolfAgain`,`PC_Hero_inAlShedim`].includes(t.id))throw Error(`Unexpected source quest without compiled runtime packet`);s++}else throw Error(`Unknown quest initialization route`)}if(o.size!==637||s!==4||a.size!==641||e.startup.explicitQuestRuns.length!==1||e.startup.explicitQuestRuns[0]!==`Xardas_FindXardas`||!a.has(`Xardas_FindXardas`))throw Error(`Quest startup coverage differs from original proof`)}var si={clock:()=>null,apply:()=>({applied:!1,reason:`Source-state inspection has not applied complete native startup or gameplay callbacks.`}),changed:()=>{throw Error(`Source-only quest state cannot execute gameplay changes.`)}};async function ci(e=si){let t=await Mr.manifest(),n=t.initial.initializedPlayer,r=t.initial.worldClock,i=t.runtime?.quests??t.urls.runtimeQuests??t.urls.quests;if(!n||!r)throw Error(`Native initialized player/clock receipts are unavailable`);let a=JSON.parse(Lr);if(a.schema!==`gothic3-initial-quests-output-v1`||a.output?.path!==`initial-quests.json`)throw Error(`Invalid separate initial-quest receipt`);let[o,s,c,l,u]=await Promise.all([Mr.read(n),Mr.read(r),Mr.read(i),_r(`dialogue/`+a.output.path,a.output),Qr()]);ri(o),ai(s,o),oi(l,c,a,s);let d=structuredClone(o),f=structuredClone(s),p=structuredClone(l),m=new zr(structuredClone(c),e);for(let e of p.quests)m.seed(e.id,{status:e.status,counters:e.counters,startedAt:e.startedAt,logKeys:e.logKeys,logPairs:e.logPairs});return{scope:`source-state-with-partial-player-startup-and-unapplied-quest-startup`,player:d,clock:f,questDocument:p,quests:m,infos:u,view:{xp:d.memory.XP,learningPointsAttributes:d.memory.LPAttribs,learningPointsPerks:d.memory.LPPerks,chapter:d.memory.Chapter,level:d.serialized.npc.Level,playerGameEvents:[...d.memory.PlayerKnows.items],inventory:d.inventory.stacks,equipment:d.inventory.equipment},pendingStartup:{explicitQuestRuns:[...p.startup.explicitQuestRuns],callbacks:[...d.unsupportedCallbacks,...p.startup.unimplemented],notes:[...d.limitations,`The player seed applies only proven stat/inventory startup effects; quest state is before OnGameStartUp.`,`Xardas_FindXardas remains Open until the native startup order is implemented.`,p.startup.evidenceLimit]}}}var li=JSON.parse(`{
  "schemaVersion": 1,
  "nativeCodeExecuted": false,
  "inputs": [
    {
      "module": "Game",
      "studyPath": "00_Original_Runtime/Game.dll",
      "sha256": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f",
      "bytes": 8228864
    },
    {
      "module": "Script",
      "studyPath": "00_Original_Runtime/Script.dll",
      "sha256": "9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08",
      "bytes": 847872
    },
    {
      "module": "SharedBase",
      "studyPath": "00_Original_Runtime/SharedBase.dll",
      "sha256": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214",
      "bytes": 1409024
    }
  ],
  "manifestSha256": "0647df2626cb44220eea645b0de2b1e8d67c129aa7427521232e941f59f30463",
  "outputs": [
    {
      "url": "native-inventory-evidence.json",
      "sha256": "6388d8486a8f15eea400c68c7f1a4cbd6eb5a2d83300f8f05dc51be2b7653bf6",
      "bytes": 479382
    },
    {
      "url": "starting-inventory.json",
      "sha256": "ebf29a284f2352d10a9852264468200c86a5929c138798f423d4a74b4f93479b",
      "bytes": 315710
    }
  ],
  "audit": {
    "selectedEntries": 136,
    "instructionRecords": 2772,
    "matchedInstructionBytes": 7666,
    "allInstructionBytesMatch": true
  },
  "startingCounts": {
    "stacks": 121,
    "intrinsicLearnedTrue": 5,
    "intrinsicLearnedFalse": 116,
    "serializedEquipment": 2
  }
}
`),ui=li.outputs?.find(e=>e.url===`starting-inventory.json`);if(!ui||li.nativeCodeExecuted!==!1||li.audit?.allInstructionBytesMatch!==!0)throw Error(`Invalid intrinsic starting-inventory receipt`);var di=ui;async function fi(e){let t=await _r(`inventory/`+di.url,di);if(t.schema!==`gothic3-native-starting-inventory-v1`||t.schemaVersion!==1||t.scope!==`intrinsic-stack-state-before-external-inventory-observers-and-later-startup-equipping`||t.sourceSeed?.url!==`../gameplay/initial/initialized-player.json`||!Array.isArray(t.stacks)||t.stacks.length!==121||e.inventory.stacks.length!==121||!Array.isArray(t.equipment)||t.equipment.length!==2||!Array.isArray(t.limitations)||t.counts?.stacks!==121||t.counts.intrinsicLearnedTrue!==5||t.counts.intrinsicLearnedFalse!==116||t.counts.serializedEquipment!==2)throw Error(`Invalid intrinsic inventory source document`);let n=0;for(let[r,i]of t.stacks.entries()){let t=e.inventory.stacks[r];if(!t||i.index!==r||t.index!==r||i.templateGuid20!==t.templateGuid20||i.templateName!==t.templateName||i.amount!==t.amount||i.quality!==t.quality||i.quickSlot!==t.quickSlot||i.hotKeyUnsigned!==t.hotKeyUnsigned||i.stackType!==0||i.linkedSlot!==0||i.activationCount!==0||i.transactionAmount!==0||typeof i.intrinsicLearned!=`boolean`||i.intrinsicLearned!==(t.learnedOperation===`setTrue`)||i.externalObserverEffects!==`requires-complete-runtime-observer-registry`)throw Error(`Intrinsic inventory facts differ from original assurance `+r);n+=Number(i.intrinsicLearned)}if(n!==5)throw Error(`Intrinsic learned count differs from audited original calls`);for(let[n,r]of t.equipment.entries()){let t=e.inventory.equipment[n];if(!t||t.slotIndex!==r.slotIndex||t.itemGuid20!==r.itemGuid20||t.templateGuid20!==r.templateGuid20||t.templateName!==r.templateName)throw Error(`Original serialized equipment identity differs`)}return t}var pi=`{
  "schema": "gothic3-native-startup-manifest-v1",
  "version": 1,
  "nativeDocument": {
    "url": "startup/native-startup.json",
    "sha256": "04fda37dd255ea66505f6ff863b338c15a45b7a4b89b5b4853b66122ef909f3d",
    "bytes": 210418
  },
  "researchTool": {
    "path": "tools/gothic3/research_native_startup.py",
    "sha256": "e9f221c8a169e323cddc78b46a5af444c86ad0f57e5fad117d12dae9068476c3"
  },
  "evidenceFiles": [
    {
      "path": "EVIDENCE.md",
      "sha256": "9a8588abe588543e97a275e1c8a769194596bb479798987769e140be4e896258",
      "bytes": 1862
    },
    {
      "path": "native-startup.json",
      "sha256": "04fda37dd255ea66505f6ff863b338c15a45b7a4b89b5b4853b66122ef909f3d",
      "bytes": 210418
    },
    {
      "path": "sources/Game/200087ab.asm.txt",
      "sha256": "c33e77c4e1f65cbaf261fc4000c2dad9ab37eeead1d5cb24ff058ae16b9eeaa9",
      "bytes": 98
    },
    {
      "path": "sources/Game/200087ab.c.txt",
      "sha256": "4638ba243a6ef01b508c003869c4e4b12a7c864ba609ad2a969c71b1ebbd10bc",
      "bytes": 7205
    },
    {
      "path": "sources/Game/20033096.asm.txt",
      "sha256": "5d9aa5d0d4ea14df0600311cb33cfe02110525aa304d8f4f7485783dbfb69da5",
      "bytes": 88
    },
    {
      "path": "sources/Game/20033096.c.txt",
      "sha256": "75d84f623111ae751a0678ad6e1e68b9a6d17cebe1c39520ad0868299e29a3f2",
      "bytes": 2314
    },
    {
      "path": "sources/Game/20374e90.asm.txt",
      "sha256": "b11f3b636602742c9cd9c357ea6d640c31f3ee895e6774def91f2508d3cce0ad",
      "bytes": 2989
    },
    {
      "path": "sources/Game/20374e90.c.txt",
      "sha256": "7984a88e59061f70d646b99f89d4009970ee5798ebb3e7a8d5b83c6298a4b126",
      "bytes": 2040
    },
    {
      "path": "sources/Game/20376690.asm.txt",
      "sha256": "f0c2de00ef17e627462ffdf61b9bddcd16eb3f1cc9f44382300bc215293de073",
      "bytes": 11794
    },
    {
      "path": "sources/Game/20376690.c.txt",
      "sha256": "d85a5c2a5f3bf7347108b0d1df386a5a999ccc083307a37dcbbb3925bd1d72b1",
      "bytes": 6988
    },
    {
      "path": "sources/Script_Game/10009400.asm.txt",
      "sha256": "6178d6434fc03941f9843d61c523c91ed53d0f6f60608edfdcf63415616bb802",
      "bytes": 44
    },
    {
      "path": "sources/Script_Game/10009400.c.txt",
      "sha256": "2f41385fcb3dfd2aaac7ca3925c817a0b78fd4d319d8fbc29f7c450674ec575d",
      "bytes": 105
    },
    {
      "path": "sources/Script_Game/10009680.asm.txt",
      "sha256": "bd9e8e2687b78c0f4141844f32572a33e6486eb3f4fd3ae6f14a9d291038a57c",
      "bytes": 400
    },
    {
      "path": "sources/Script_Game/10009680.c.txt",
      "sha256": "da3f5538d2bb8c5a2e20409a4a7179ef70a5c46722d09569b0aaef343167aa3e",
      "bytes": 255
    },
    {
      "path": "sources/Script_Game/1000a6f0.asm.txt",
      "sha256": "d1c2dd45fa99fc3e1f526eb0d54c2f35bae53add89f25c3347dc16b60c609a38",
      "bytes": 87
    },
    {
      "path": "sources/Script_Game/1000a6f0.c.txt",
      "sha256": "afe43e2f6246c392dbad96b78dc83862925c7e7aed00889d2d86bcdefdd1e364",
      "bytes": 147
    },
    {
      "path": "sources/Script_Game/1000a800.asm.txt",
      "sha256": "3b1c11a9b47f0f61ed606ef1127a3919bea2db0a7c6afed072a8b241fbab6b4c",
      "bytes": 358
    },
    {
      "path": "sources/Script_Game/1000a800.c.txt",
      "sha256": "5dd39452bcc024c1bc98dc464173fa0741d3139c10b5c27cc4cab989863bf284",
      "bytes": 275
    },
    {
      "path": "sources/Script_Game/1000a9a0.asm.txt",
      "sha256": "7f79ae0fd82f25ea7adf721e5ee40a6e867bff3ef6b3a5491e997e4eb659ba8e",
      "bytes": 1151
    },
    {
      "path": "sources/Script_Game/1000a9a0.c.txt",
      "sha256": "a1a4a0aeee4b0017ef1b20eb6b881f3c1e0fbb51e7e3d6963e4ea5c3b583dac4",
      "bytes": 550
    },
    {
      "path": "sources/Script_Game/1000adc0.asm.txt",
      "sha256": "58bd7f20c697010f71ec103818ef918f7ce8f49ed307529ba37a4bd3485531c6",
      "bytes": 44
    },
    {
      "path": "sources/Script_Game/1000adc0.c.txt",
      "sha256": "85e14c8bd7ef1bdec2f227e6ea79b8d7e43d5803c3098deaf36ca7b673175fff",
      "bytes": 105
    },
    {
      "path": "sources/Script_Game/1000b3e0.asm.txt",
      "sha256": "78f593514a2a82f4dd1b2f49568407a1ed8863de681cc55ac14dd18830fade70",
      "bytes": 44
    },
    {
      "path": "sources/Script_Game/1000b3e0.c.txt",
      "sha256": "46487c932dde6d1f12a863102464a8f863340c4ef57fcb09f17da438cd601c2b",
      "bytes": 105
    },
    {
      "path": "sources/Script_Game/1000b4a0.asm.txt",
      "sha256": "8a482e6ead581ce04da6ad96ea3de7d71b695824cd549fc47bffd0ac7d405fa5",
      "bytes": 827
    },
    {
      "path": "sources/Script_Game/1000b4a0.c.txt",
      "sha256": "b921a1fa199d8a3f1242eaa5925745a8c1e41c19632c65fbfb7ccde1d7d58684",
      "bytes": 408
    },
    {
      "path": "sources/Script_Game/1000e380.asm.txt",
      "sha256": "a8118f8f597562606066a9f8e3ea4954e61512ac007c832e84ff766872c99f7f",
      "bytes": 20650
    },
    {
      "path": "sources/Script_Game/1000e380.c.txt",
      "sha256": "cf5c104ae6cdab8eb2517ca8974409dee4d9dd4a9522d37920a47fb7d6ece497",
      "bytes": 5534
    },
    {
      "path": "sources/Script_Game/1000ebc0.asm.txt",
      "sha256": "b4be1c661c67a881fc279a8555252c502705900a5439ee17ecb23b992664a32f",
      "bytes": 709
    },
    {
      "path": "sources/Script_Game/1000ebc0.c.txt",
      "sha256": "7721cb0ebd9e56bcdee833a9c8443fba390790f2284b93ac224da3d83b7974db",
      "bytes": 348
    },
    {
      "path": "sources/Script_Game/1000ed50.asm.txt",
      "sha256": "3203290ecbc8006e265364bd782aba8519fe30f0737e8843e2788bbc2481776c",
      "bytes": 1025
    },
    {
      "path": "sources/Script_Game/1000ed50.c.txt",
      "sha256": "8e145e2e0a565ef0804ea7bb4df33b8679a9639534976feb562db5ce1c35d300",
      "bytes": 600
    },
    {
      "path": "sources/Script_Game/1000ee40.asm.txt",
      "sha256": "b48ed974a11e292c4e9301c64405131283c497d71069aefdac786130be2a8306",
      "bytes": 3299
    },
    {
      "path": "sources/Script_Game/1000ee40.c.txt",
      "sha256": "ddf946a4544eafdc57dbd14d45d35a19c014dcf453712c99310226582188d393",
      "bytes": 1284
    },
    {
      "path": "sources/Script_Game/10015990.asm.txt",
      "sha256": "f1d67c2977df20deafda0c24d33c10da84a9f0c5545a6403b7e3f58acb51ac07",
      "bytes": 1818
    },
    {
      "path": "sources/Script_Game/10015990.c.txt",
      "sha256": "937afca1a212eb8c944e0961f3a07b255db5fac1280a6ba2f1ffb57e26ca0bb0",
      "bytes": 855
    },
    {
      "path": "sources/Script_Game/10016160.asm.txt",
      "sha256": "79ec52806c4095fcc997aaa6d38323e8013c18a3acbfe2b1dcc6c38bfcea7107",
      "bytes": 1808
    },
    {
      "path": "sources/Script_Game/10016160.c.txt",
      "sha256": "c48aff8afb71bf9bdbe4d94b47d82d319e894a588ce33c43b4c87e27e739d27f",
      "bytes": 652
    },
    {
      "path": "sources/Script_Game/100183e0.asm.txt",
      "sha256": "0cde246a4f29ec0569d889b66261575de0e26b271be857497e30ac5932def026",
      "bytes": 10775
    },
    {
      "path": "sources/Script_Game/100183e0.c.txt",
      "sha256": "79cbfaf2c9a2eb9428ede485309e1f49e73f7b90f628a06fc82a45f1e65d54f4",
      "bytes": 4829
    },
    {
      "path": "sources/Script_Game/100443c0.asm.txt",
      "sha256": "6ca5fe3052ef3c9338be0454cb6abc459e3340aa9ff70fcf8f2b2c7766090c03",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/100443c0.c.txt",
      "sha256": "9e34e51332ab46ba224a493fe9192dea7e74412f08ad62a5c4d34857c514ac87",
      "bytes": 926
    },
    {
      "path": "sources/Script_Game/10044490.asm.txt",
      "sha256": "3cd511a58a7c4799304d4bf364dc2b2bd40d3c45a39c751fbd9adb92d707b2ac",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/10044490.c.txt",
      "sha256": "78cceaf1c190f81e255c66e786fb75b2afc8934eba941ee0814996e3b06b4878",
      "bytes": 927
    },
    {
      "path": "sources/Script_Game/10044560.asm.txt",
      "sha256": "ab33627679b88054fe5f7ab3be812443826a3f4b9e6eb907fb8de06dc0e5b160",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/10044560.c.txt",
      "sha256": "0fa2221fe9b04da57ceb5e02fac9a1d14e1eee3ab3a662108b8e72397c82c2f7",
      "bytes": 930
    },
    {
      "path": "sources/Script_Game/10044630.asm.txt",
      "sha256": "39c29756299c7f8c59e51791fd0c68fff3733c56c4e07e65df6868ebd56e4773",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/10044630.c.txt",
      "sha256": "e449bf1c7edc422111597e86d45ea0d554df84e6ebcd3c07fda648fadb90eaef",
      "bytes": 925
    },
    {
      "path": "sources/Script_Game/10044700.asm.txt",
      "sha256": "2fd1f31f60af43d121ed9153be21bc0a04410f30b4947d430c744110d0b5f28a",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/10044700.c.txt",
      "sha256": "ea79be5929b2a738794558497c073e18e2329006be2604653e66495b75a29531",
      "bytes": 926
    },
    {
      "path": "sources/Script_Game/100447d0.asm.txt",
      "sha256": "6c2bf0fe3f77e8b664b9e726eb159592093b7af96c3bffff3eefe58979a2a2dd",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/100447d0.c.txt",
      "sha256": "dbcda9095eb0e6a2289ce990a21a9314d39f0b86deffa69b0dbb88efbca6e7fe",
      "bytes": 923
    },
    {
      "path": "sources/Script_Game/10044f00.asm.txt",
      "sha256": "9112c930b2b8d98b866ca6149824ec972372e2eb7bd3c249db077c4f68e43995",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/10044f00.c.txt",
      "sha256": "5d1b5a612300bd4782a3f1d6ffd7b797afafb466a44474dbf0107803b3c37d9f",
      "bytes": 934
    },
    {
      "path": "sources/Script_Game/10044fd0.asm.txt",
      "sha256": "07aa1ce2f29a8aa87177c01e1be658747aa5e41c260377c85216b91b45e65b97",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/10044fd0.c.txt",
      "sha256": "2bd2396ca61bc062129f65b9169a3f4920ccf2e8011d1f4a1663ff437feac231",
      "bytes": 934
    },
    {
      "path": "sources/Script_Game/100450a0.asm.txt",
      "sha256": "e3e38b51100ec635eb2365e68e5ce1f628f2d0c852e2a72279b5886cee182781",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/100450a0.c.txt",
      "sha256": "0bd1f4fb29ac929c5bed1ccc707e6866969f2eae4b58c3e0aa926303cf7b360e",
      "bytes": 935
    },
    {
      "path": "sources/Script_Game/10045170.asm.txt",
      "sha256": "0e3c4d1cbc8a7de3d0844eca451d2b4c01bfbd1bc28d1d06f8705313ba4d0211",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/10045170.c.txt",
      "sha256": "4f83d69bbdf504a926faf58010c3243586f44e2dfb28c77b4b9fb5f3816e734b",
      "bytes": 932
    },
    {
      "path": "sources/Script_Game/10045240.asm.txt",
      "sha256": "89201c9249716336a6aca28ca8f414f230383dc77b13fe31c64d310218e69cc3",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/10045240.c.txt",
      "sha256": "7d0de6e04965c46e8e5168402399906e2df4c683c233a26de9d8e6bb1d76340e",
      "bytes": 931
    },
    {
      "path": "sources/Script_Game/10045310.asm.txt",
      "sha256": "52162436762ac5e57ccd1b81be93200709fcc9a4616107d8579bc916d23d54ba",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/10045310.c.txt",
      "sha256": "fbdf24982e33ab0c7c5e8e13185ff90777f44eb82a8cabe3f3f2d34481ea0317",
      "bytes": 937
    },
    {
      "path": "sources/Script_Game/10045b20.asm.txt",
      "sha256": "9defc90707974a873064670e13e5efcc6d3dfe7bdb8708eb27554bb1207332ec",
      "bytes": 4108
    },
    {
      "path": "sources/Script_Game/10045b20.c.txt",
      "sha256": "0f96a328264512e96896e6c678a408c4cc471fdb681d47be51906422ae29c970",
      "bytes": 1824
    },
    {
      "path": "sources/Script_Game/10045c90.asm.txt",
      "sha256": "48cc992cdd32971f4fd7afe7d315d9a1cd9327b0dd90d5861a44752fe300f46f",
      "bytes": 4504
    },
    {
      "path": "sources/Script_Game/10045c90.c.txt",
      "sha256": "7f4ed77ce17f84ba8b046800fc3148b1042771054a02e4064c62fec657a4cc5f",
      "bytes": 1964
    },
    {
      "path": "sources/Script_Game/100461d0.asm.txt",
      "sha256": "60fbec22a1351d3a2b2b3aaa62b5feca058e82f9d0a3bf288a556e350e05518f",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/100461d0.c.txt",
      "sha256": "4fb87bcc1ddd2819977f7a82650522bd8774d7f05e7abbada463f710beb307b7",
      "bytes": 928
    },
    {
      "path": "sources/Script_Game/100462a0.asm.txt",
      "sha256": "293315d1692393beee56c7624f71457eba2e178214e8bb8d3a06cc21134a7f43",
      "bytes": 2279
    },
    {
      "path": "sources/Script_Game/100462a0.c.txt",
      "sha256": "33874a4b3478ca373db5cb4c790a7a98ad05c22311d1e4cd0ec42afa264017e2",
      "bytes": 931
    },
    {
      "path": "sources/Script_Game/100467f0.asm.txt",
      "sha256": "97d691535c798937dbafa2e4b00c27a23c14367135a73a15775f6604f26bb69e",
      "bytes": 4108
    },
    {
      "path": "sources/Script_Game/100467f0.c.txt",
      "sha256": "5efeb20c155d2939ea77c47787c259e0c78a0db9a417e8b8447be513d497661a",
      "bytes": 1895
    },
    {
      "path": "sources/Script_Game/10046960.asm.txt",
      "sha256": "2161453c18b4aa2ce14632ac5d4e0a14db18b8a3fc7b1b2e58a91a42f025d6f9",
      "bytes": 4504
    },
    {
      "path": "sources/Script_Game/10046960.c.txt",
      "sha256": "af1ad4418f73e97b23c5cee293910c7de02494ca76e165d7aa1e11fb39fcf53f",
      "bytes": 2057
    },
    {
      "path": "sources/Script_Game/10075220.asm.txt",
      "sha256": "bd98b683bb872913b61fafae7a15fb69dee44dac1f0619c6b90fb9e1e3d86b42",
      "bytes": 9918
    },
    {
      "path": "sources/Script_Game/10075220.c.txt",
      "sha256": "46863fdcb9fd660e09342df50d1de97bbb6cf864a390ebd0a07cc6df9b3735fb",
      "bytes": 5377
    },
    {
      "path": "sources/Script_Game/100755e0.asm.txt",
      "sha256": "640fac1a014403a62decebff34ec5f917a759b077d5d2d2ed3fbe1ee48f71680",
      "bytes": 39325
    },
    {
      "path": "sources/Script_Game/100755e0.c.txt",
      "sha256": "176e065e1af1f68fae9832a3d7b43407783e0f5982787feaa686a13fd0093512",
      "bytes": 18231
    },
    {
      "path": "sources/Script_Game/10077540.asm.txt",
      "sha256": "731651a1e0ceae409006f13c8f4a345ceb2aa1f54415c1b73faa638a2daacafa",
      "bytes": 2180
    },
    {
      "path": "sources/Script_Game/10077540.c.txt",
      "sha256": "ee9f10e26f8e7d392e2aaccbeedaa414e3867c66e929ea57421064be50917b7f",
      "bytes": 861
    },
    {
      "path": "sources/Script_Game/100901f0.asm.txt",
      "sha256": "21c2fce8a5efab10cf176f76a20909b6f8c16497f971f361c33644141167c9fa",
      "bytes": 54523
    },
    {
      "path": "sources/Script_Game/100901f0.c.txt",
      "sha256": "1d22974d610485734933542696b9085404a0a793a260c53799afe43b10cea3df",
      "bytes": 20050
    },
    {
      "path": "sources/Script_Game/10091ad0.asm.txt",
      "sha256": "92af67550c0333a8deb053496decd501d6ec0953a8cdb9af4666a090722aa430",
      "bytes": 2145
    },
    {
      "path": "sources/Script_Game/10091ad0.c.txt",
      "sha256": "aa2c9e8d002b76c480f43ae73b8a7a59618044675fa57dcf738f1e4d19cf23d4",
      "bytes": 804
    },
    {
      "path": "sources/Script_Game/100cfa10.asm.txt",
      "sha256": "af0a61806b662839a3c47bf6334328d091821ea7dd89549ede7e6ae2533ba014",
      "bytes": 3902
    },
    {
      "path": "sources/Script_Game/100cfa10.c.txt",
      "sha256": "156342a425d0c3cf51cf49f326976318c274ac0d6a19e694a9d1bf9c89c3886b",
      "bytes": 2417
    },
    {
      "path": "sources/Script_Game/100cfb70.asm.txt",
      "sha256": "99a43c7210164180893057027a4c89b471b739a2207cd0b4fe1a1ca20a2041f2",
      "bytes": 13167
    },
    {
      "path": "sources/Script_Game/100cfb70.c.txt",
      "sha256": "62a0641a2f333eed116ac03ca27e53735a64dcde9952967e8c29fe95389964ec",
      "bytes": 5390
    },
    {
      "path": "sources/Script_Game/100d0470.asm.txt",
      "sha256": "dc053df90012c0f630c1999948a8f423502914ad279dee255231f7c3d0841dde",
      "bytes": 2911
    },
    {
      "path": "sources/Script_Game/100d0470.c.txt",
      "sha256": "0089ec1a82f54f6b1cd57a87f36fd770708ec2da43b83e70c0100fabb20a5e93",
      "bytes": 1038
    },
    {
      "path": "sources/Script_Game/100d2e80.offline.asm.txt",
      "sha256": "46ebe66bf437bec7cc137f12fb41a4b081a2e692be4dd5b55ab419b5ab0b4d1a",
      "bytes": 9139
    },
    {
      "path": "sources/Script_Game/100d3590.offline.asm.txt",
      "sha256": "345691dee34b177b147ec7cebf83bae02911b8bcc53d9bcf077d7a6183e9e3b2",
      "bytes": 4964
    },
    {
      "path": "sources/Script_Game/100d5e30.asm.txt",
      "sha256": "a014c6c79d53963374e686165d846a984990c3ec15d0ce90998aba7e16d68724",
      "bytes": 7377
    },
    {
      "path": "sources/Script_Game/100d5e30.c.txt",
      "sha256": "71c6216c8490cf0f87953dcaa6a95835fa8e9a02d424a3748fb4a9f82edc4dc6",
      "bytes": 3562
    },
    {
      "path": "sources/Script_Game/1010a010.asm.txt",
      "sha256": "d744cfb0ee2c0c1fd225353161c8d0481805f1af625f7b79a2214b41d714d95d",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/1010a010.c.txt",
      "sha256": "f29f0379a76a675565c4c8db09ae3e6d3e36e668a13734b7666ba956d64d4e6f",
      "bytes": 409
    },
    {
      "path": "sources/Script_Game/10128500.asm.txt",
      "sha256": "26471e5e9a1b3d22c621fb3a12200b79cdac78660d691fe863dc4e2e450e5dd5",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10128500.c.txt",
      "sha256": "96dfbb429cf1c483e32be421ba1fcf7b3ca1ac76e8c59d68de9559b6757c2692",
      "bytes": 399
    },
    {
      "path": "sources/Script_Game/10128570.asm.txt",
      "sha256": "31bf477b9094fd434cc7aad66689cb3066db924b19c558f74472bf8ed56ddfc8",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10128570.c.txt",
      "sha256": "0335a7c268dfc5f75adcba5d40e37a28d5d555ce1a4452d671c7cc83b2344549",
      "bytes": 400
    },
    {
      "path": "sources/Script_Game/101285e0.asm.txt",
      "sha256": "a8bb456b49d5e93e9d8db14a49c6a8b61630f3b25fe9bb0de68ccb9f9419f50b",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/101285e0.c.txt",
      "sha256": "065bd918dce5873f599cd725a6f6cbc0614a24364480a6042cf4a37a5a6f7db8",
      "bytes": 403
    },
    {
      "path": "sources/Script_Game/10128650.asm.txt",
      "sha256": "5531e826cc4a2e34b353e4778d31039d0da1ec52d67e0cd34de58394bf016670",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10128650.c.txt",
      "sha256": "3abffbd53648623608b63b3382097131fbd20df21a287ef8208c2a9b74a2d62e",
      "bytes": 398
    },
    {
      "path": "sources/Script_Game/101286c0.asm.txt",
      "sha256": "99ee88af320a900ce4d4008aabab9d3b590a56bfeaa87773953926de856a0c75",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/101286c0.c.txt",
      "sha256": "35bf2ca5fdb4c105c9c7d9a897b21bf795fc61aa091c7163443d5196da840d2f",
      "bytes": 399
    },
    {
      "path": "sources/Script_Game/10128730.asm.txt",
      "sha256": "3e41ea90a475b916d2f42e3fbc68022fa40633cd0e2b74353a57df5a5765e5ad",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10128730.c.txt",
      "sha256": "208f2475a749d413a7c5150be3f3e67d7b3ed139974132b32730f971cfa087ae",
      "bytes": 397
    },
    {
      "path": "sources/Script_Game/10128ce0.asm.txt",
      "sha256": "ebd35e5c2daf6e603dc2bf0857708c71911a5e6bccfdc06ba53d10a7535b8b9a",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10128ce0.c.txt",
      "sha256": "2c374ada342a2fa30e885fd93492bdd49183228d6ff8c4ca94d5c8e04dedd2c9",
      "bytes": 407
    },
    {
      "path": "sources/Script_Game/10128d50.asm.txt",
      "sha256": "9c7c414c6ff810e10affc69c526b49a310135c2f5e23c39aea8c06e5a64968b1",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10128d50.c.txt",
      "sha256": "7181b9721e1980309a533c1db5f19a336b13ed152d55bbde1b36f42decc59c78",
      "bytes": 407
    },
    {
      "path": "sources/Script_Game/10128dc0.asm.txt",
      "sha256": "7bc76323b6da3ac7a6123b2cd9b30693aa69355f45567384bfa02a79b0b8616f",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10128dc0.c.txt",
      "sha256": "692bf880332b123aed43c7fae07ec7088c4f6c90d3dc7afacf17239887201f0b",
      "bytes": 408
    },
    {
      "path": "sources/Script_Game/10128e30.asm.txt",
      "sha256": "5fbb30b1215e11720a47df3edd9522d419c71931ba884e905bc57f8b0d18ba14",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10128e30.c.txt",
      "sha256": "d06885f7710888c4e577e5dfa18db86c0f357faed541779694329bd020ea6d61",
      "bytes": 405
    },
    {
      "path": "sources/Script_Game/10128ea0.asm.txt",
      "sha256": "129ea73fee38bb9b0319e42e20b163c0c9618cb7c613e65f3a54a03b08d47e62",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10128ea0.c.txt",
      "sha256": "0c4e5e54f3afa0fd3dad6d4fce47acf9f05d6a0197b75d043f841bfa67498c38",
      "bytes": 404
    },
    {
      "path": "sources/Script_Game/10128f10.asm.txt",
      "sha256": "e203f8216a3130f1809c077e45c1cec2ed50fbe1fd631a01e1cee88cb7226ebd",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10128f10.c.txt",
      "sha256": "471d96e1366189b0f1646430a21fe743dafc9cc3097739425f3ea287036d6966",
      "bytes": 410
    },
    {
      "path": "sources/Script_Game/10129370.asm.txt",
      "sha256": "01c9efac9cb223026696bc44f0b5d2e210d7a85d6853ade5c7b38fc0c3d8198a",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10129370.c.txt",
      "sha256": "94e971d5c5375e34b045063782dc8d79989a82a0765c6dba2308f79aabfa06a3",
      "bytes": 400
    },
    {
      "path": "sources/Script_Game/101293e0.asm.txt",
      "sha256": "e5b94fe72d444806790948ee103612ccc1024b3ef4889189c8ecafc8311c50de",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/101293e0.c.txt",
      "sha256": "6629e878ae6bac9a9d44ad4cc8a475956ad8e3178fe7c510103953b3317a6b30",
      "bytes": 403
    },
    {
      "path": "sources/Script_Game/10129680.asm.txt",
      "sha256": "bd3a3acafc7707dd94ef71f957c5e16a2de9aa882a4daa497469a344e742e2cb",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10129680.c.txt",
      "sha256": "94152bbd07f14dbb3ca93b0ad88d424bc431442db8e7aa3d5b24f2830b123707",
      "bytes": 401
    },
    {
      "path": "sources/Script_Game/101296f0.asm.txt",
      "sha256": "3050d20f1418deb56f201b4fcf89bb30ee815b149c29e8df84ca6c904d634c5d",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/101296f0.c.txt",
      "sha256": "3428937dfe3c33977510e094910feee674a72c1be921668118295e1e2f06039e",
      "bytes": 404
    },
    {
      "path": "sources/Script_Game/10129990.asm.txt",
      "sha256": "cdc3b22706f58a86a3d4d1c59312abc74dd968e2bbd0a2f354b8d104ba32da66",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10129990.c.txt",
      "sha256": "e434bd75345f7783918b3da281ffc507a65daeb703a1848b8df85ebd9b615412",
      "bytes": 404
    },
    {
      "path": "sources/Script_Game/10129a00.asm.txt",
      "sha256": "0821ed989e2c72bf1cbfc19da97f93eac0eae7929c70f61ece2c84372836f637",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10129a00.c.txt",
      "sha256": "7226200731d6ab62e7ddb8f4311f07afc4d4eea7584d648e375e790736e8e592",
      "bytes": 407
    },
    {
      "path": "sources/Script_Game/1014b790.asm.txt",
      "sha256": "78579037f702bc90d3f8fe5c8de711bc6d51d0de717cfd6aad074da0459e7652",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/1014b790.c.txt",
      "sha256": "42c200de242d75839bf9ab7acc492b92f243c374d69ff565374d80b8a547e7fd",
      "bytes": 390
    },
    {
      "path": "sources/Script_Game/1014b800.asm.txt",
      "sha256": "3cc10e1ce4c6e6320a3802c093c30c4bcfaced3cd1ce4279788b75118ddb5b4f",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/1014b800.c.txt",
      "sha256": "1fb2ccd4f82b62d462ca54acc05f142d351226ba3bba85d536d28e50fb30b2f7",
      "bytes": 396
    },
    {
      "path": "sources/Script_Game/1014c1e0.asm.txt",
      "sha256": "6a7db6fefdfd93ba595ab311a791c25bc0bb36ff4b3aa9acba0dc079251af761",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/1014c1e0.c.txt",
      "sha256": "8298f1bc2209481920286794b70c6ef0efc787147146b90b63ae722627784c45",
      "bytes": 412
    },
    {
      "path": "sources/Script_Game/10152b20.asm.txt",
      "sha256": "44345c9842c84a2ace73e825fa1dc789587f31f1adaaa523c489dff03c3fa2d5",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10152b20.c.txt",
      "sha256": "811573eb48474ee4635ea5af3f6f2bf35ab03b2fbcf4337eee3b977b7e091888",
      "bytes": 423
    },
    {
      "path": "sources/Script_Game/10152c00.asm.txt",
      "sha256": "ef25da1c25d2ba3f387d52936a967396c232d3a00e335488d711ee2c1c20bd56",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10152c00.c.txt",
      "sha256": "c69353a142df02524646c81afcad2c374ae94453f9ee38d5c5c628b6d7722b65",
      "bytes": 413
    },
    {
      "path": "sources/Script_Game/101703d0.asm.txt",
      "sha256": "bc6690ada3c777b34e44f1ef8c068e4cbfe0b6bf77ab3533daa0227f527600a5",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/101703d0.c.txt",
      "sha256": "9893a84f64d3fa03f3ea0a738c26504c2716497dab16ac00d22161a567bf41c2",
      "bytes": 408
    },
    {
      "path": "sources/Script_Game/10171250.asm.txt",
      "sha256": "f378c02faec4be72e76fedf002f086ec74df10e456b8f21beb8dbf1f3bfb4b4e",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10171250.c.txt",
      "sha256": "2750e4ba079f67bb7c31adcfdae90f18148b2b8c7a364245f13d7226e570aef1",
      "bytes": 393
    },
    {
      "path": "sources/Script_Game/101742a0.asm.txt",
      "sha256": "40666c233c7b227601b9b2c78174de9aa6eae79364be893bc6f23db66da4cf80",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/101742a0.c.txt",
      "sha256": "36d23b554bd67495a9c91652e8fcadf8129ef5f49baeb8d2e93d7322af079933",
      "bytes": 415
    },
    {
      "path": "sources/Script_Game/101749e0.asm.txt",
      "sha256": "7b317d4a06a7148095ca3a64b84ddead283e5a6bf82e039d5dd7dbe3026da09d",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/101749e0.c.txt",
      "sha256": "04dc4f9d78009b5440e1817e977d7181b906454a4889dec8ded4a4afbc5041d2",
      "bytes": 393
    },
    {
      "path": "sources/Script_Game/10174a50.asm.txt",
      "sha256": "8585c21a5f0ba3a56a1bfdb49b6d58c2ac3e1211dcacfa3e52c73908734217a7",
      "bytes": 881
    },
    {
      "path": "sources/Script_Game/10174a50.c.txt",
      "sha256": "42153a94a57110f16b25c8e0528823f044be6b218bcd01711eb62564b7e381d1",
      "bytes": 398
    }
  ],
  "instructionsAudited": 7220
}
`,mi=Object.freeze({Script_Game:`2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1`,Game:`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`}),hi=[[`102203d8`,`10009400`],[`102203dc`,`10009680`],[`102203e4`,`1000e380`],[`102203fc`,`1000ebc0`],[`102203d9`,`1000a6f0`],[`10220420`,`1000ed50`],[`10220640`,`1000a800`],[`10220650`,`1000ee40`],[`10220678`,`1000a9a0`],[`102203da`,`1000adc0`],[`102203db`,`1000b3e0`],[`10220e84`,`1000b4a0`]],gi=[[`SetHitPointsMax`,200,`10045c90`],[`SetHitPoints`,200,`10045b20`],[`SetManaPointsMax`,100,`100462a0`],[`SetManaPoints`,100,`100461d0`],[`SetStaminaPointsMax`,100,`10046960`],[`SetStaminaPoints`,100,`100467f0`],[`SetStrength`,100,`100443c0`],[`SetDexterity`,100,`10044490`],[`SetIntelligence`,0,`10044560`],[`SetSmithing`,10,`10044700`],[`SetTheft`,10,`100447d0`],[`SetAlchemy`,10,`10044630`],[`SetProtectionBlades`,0,`10044f00`],[`SetProtectionImpact`,0,`10044fd0`],[`SetProtectionMissile`,0,`100450a0`],[`SetProtectionFire`,0,`10045170`],[`SetProtectionIce`,0,`10045240`],[`SetProtectionLightning`,0,`10045310`]];Object.freeze([`Clock CLI time override if present, factor12, ResumeClock`,`Session.Resume`,`New-game engine component disable and channel0 mute`,`20 engine-process warmup iterations with native Sleep100ms`,`CloseMenu/ClosePage`,`OnReturnFromMenu including NPC health/stamina refresh`,`G3_Intro.bik and restore audio/component`,`Optional TUT_Start and thread-pool restoration`,`Native ongoing AI/ROI/contact scheduling`]);function _i(e,...t){return{status:`unsupported`,reason:e,dependencies:t,effects:[],gameplayReady:!1}}function vi(e,t=new Set){if(e&&typeof e==`object`&&!t.has(e)){t.add(e);for(let n of Object.values(e))vi(n,t);Object.freeze(e)}}var yi=null,bi=new WeakSet;function xi(){return yi||=(async()=>{let e=JSON.parse(pi),t=e.nativeDocument;if(e.schema!==`gothic3-native-startup-manifest-v1`||e.version!==1||!t||t.url!==`startup/native-startup.json`||!/^[0-9a-f]{64}$/.test(t.sha256)||!Number.isSafeInteger(t.bytes)||t.bytes<1)throw Error(`Invalid bundled native startup output receipt.`);let n=Si(await _r(t.url,t));if(n.status===`unsupported`)throw Error(n.reason);return bi.add(n.value),n.value})().catch(e=>{throw yi=null,e}),yi}function Si(e){if(!e||typeof e!=`object`)return _i(`Invalid native startup document.`,`native-startup.json`);let t=e;if(t.schema!==`gothic3-native-startup-v1`||t.version!==1||t.profile!==`installed-build-new-game-start0`)return _i(`Unsupported native startup document profile.`,`installed build receipt`);if(!t.inputs||t.inputs.Script_Game?.sha256!==mi.Script_Game||t.inputs.Game?.sha256!==mi.Game)return _i(`Native startup input hash mismatch.`,`installed build PE hashes`);if(!Array.isArray(t.onInitHelpers)||t.onInitHelpers.length!==hi.length||t.onInitHelpers.some((e,t)=>!e||e.receiverVA!==hi[t][0]||e.bodyVA!==hi[t][1]||!Array.isArray(e.effects)))return _i(`OnInit helper order is incomplete.`,`12 original helper resets`);if(!Array.isArray(t.startupOperations))return _i(`Missing startup recipe.`,`ordered original callback effects`);let n=t.startupOperations.filter(e=>e.kind===`setPlayerStat`);return n.length!==gi.length||n.some((e,t)=>e.setter!==gi[t][0]||e.value!==gi[t][1]||e.body!==`0x`+gi[t][2])?_i(`Player startup setters differ from audited recipe.`,`18 original stat setter calls`):!Array.isArray(t.entities)||t.entities.length!==7||!Array.isArray(t.callbackOrder)||t.callbackOrder[0]!==`OnInit`||t.callbackOrder[1]!==`OnGameStartUp`||!Array.isArray(t.limitations)||!t.audit||!t.gornExitCallback||!t.returnFromMenuCallback?_i(`Native startup source evidence is incomplete.`,`source entities and callback lifecycle receipts`):(vi(t),{status:`resolved`,value:t,evidence:[`Script_Game:100d0470`,`Script_Game:100cfb70`,`Game:20376690`]})}function j(e,t,n=`p`,r){let i=document.createElement(n);return i.textContent=t,r&&(i.className=r),e.append(i),i}function Ci(e,t,n=!1){let r=document.createElement(`details`);return r.open=n,j(r,t,`summary`),e.append(r),r}function wi(e){return typeof e==`string`?e:e&&typeof e==`object`&&`call`in e&&typeof e.call==`string`?e.call:JSON.stringify(e)??`Unresolved original callback`}function Ti(e){let t=typeof e.entity==`string`?e.entity+`: `:``;switch(e.kind){case`resetEntityCaches`:return`Reset the script entity caches`;case`setPlayerChapter`:return`Hero Chapter = `+e.value;case`repairDoorTranslation`:return t+`adjust door height by `+e.deltaYcm+` cm`;case`repairNpcAlignment`:case`setEnclaveAlignment`:return t+`PoliticalAlignment = `+e.alignment;case`setNavigationRoutine`:return t+`routine `+e.routine;case`setEnclaveRaid`:return t+`Raid = `+e.value;case`setEnclaveRevolution`:return t+`Revolution = `+e.value;case`notifyEnclave`:return`NotifyEnclave(`+e.self+`, `+e.other+`, event `+e.event+`)`;case`runQuest`:return`RunQuest `+e.quest;case`setExitRoiScript`:return t+`ExitROIScript = `+e.script;case`setPlayerStat`:return`Hero `+e.setter+`(`+e.value+`)`;case`setPlayerLearningPointsAttributes`:return`Hero attribute LP = `+e.value;case`inventoryPopulate`:return`InventoryPopulate(Hero, None, `+e.argument+`)`;default:return JSON.stringify(e)}}function Ei(e,t,n,r){j(e,`Original player state`,`h3`),j(e,`Source state with partial player startup. Quest startup and remaining native callbacks have not been applied.`);let i=t.player.stats;j(e,`HP `+i.hitPoints.current+`/`+i.hitPoints.max+` · MP `+i.manaPoints.current+`/`+i.manaPoints.max+` · SP `+i.staminaPoints.current+`/`+i.staminaPoints.max),j(e,`Serialized Level `+t.view.level+` · XP `+t.view.xp+` · Attribute LP `+t.view.learningPointsAttributes+` · Perk LP `+t.view.learningPointsPerks+` · Chapter `+t.view.chapter);let a=t.clock.calendar,o=[a.hour,a.minute,a.second].map(e=>String(e).padStart(2,`0`)).join(`:`);j(e,`Original clock: year `+a.year+`, day `+a.day+`, `+o+` · factor `+t.clock.factor+`. Elapsed time is not running in this view.`),j(e,`Player game events: `+(t.view.playerGameEvents.join(`, `)||`none in the initialized source seed`)+`.`);let s=t.infos.snapshot(),c=Ci(e,s.records.length+` original dialogue states`);j(c,`Fresh-world INI profile: `+s.records.filter(e=>e.currentGiven).length+` Given=true · `+s.records.filter(e=>e.permanent).length+` stored Permanent=true. This is before startup, with no native save restored.`),j(c,`The latest compiled-info archive entry deletes the older catalog. The native loader falls back to source INIs for this profile.`),j(c,`Dialogue eligibility, derived permanence and command execution need their remaining runtime services. Inspecting these states changes no Given flag.`);for(let e of s.unapplied)j(c,e,`p`,`record-meta`);let l=Ci(e,`Pending startup`,!0),u=Ci(l,`Original startup order`);j(u,`OnInit resets `+r.onInitHelpers.length+` script helpers before OnGameStartUp. These are source instructions; this inspector does not execute them.`);let d=document.createElement(`ol`);u.append(d);for(let e of r.startupOperations)j(d,Ti(e),`li`);j(u,`Ardea enters its raid before RunQuest. Completing this callback also requires the later session, NPC task and ROI lifecycle.`),j(l,`Xardas_FindXardas: `+(t.quests.state(`Xardas_FindXardas`)?.status===Rr.Open?`Open`:`unexpected source status`)+`. The original startup RunQuest has not been applied.`);let f=document.createElement(`ul`);l.append(f);for(let e of t.pendingStartup.callbacks)j(f,wi(e),`li`);for(let e of t.pendingStartup.notes)j(l,e,`p`,`record-meta`);let p=Ci(e,t.view.equipment.length+` serialized equipment slots`);for(let e of t.view.equipment)j(p,e.templateName+` · original slot `+e.slotIndex,`p`),j(p,`Template `+e.templateGuid20+` · item `+e.itemGuid20,`p`,`source`);let m=Ci(e,t.view.inventory.length+` original inventory assurances`);j(m,`Amounts, qualities and hotkeys come from the original startup assurances. Intrinsic stack creation leaves 116 Learned=false and explicitly sets five true. External inventory observers and later physical equipping remain unapplied.`);let h=document.createElement(`ul`);m.append(h);for(let e of n.stacks)j(h,e.templateName+` × `+e.amount+` · quality `+e.quality+(e.quickSlot===null?``:` · quickslot `+e.quickSlot)+` · intrinsic Learned `+e.intrinsicLearned,`li`);for(let e of n.limitations)j(m,e,`p`,`record-meta`);let g=Ci(e,t.questDocument.questCount+` original quest states`);j(g,t.questDocument.runtimePacketCount+` compiled runtime packets and four fresh factory/INI records. All are Open, with zero delivery counters and activation times before startup.`);for(let e of t.questDocument.quests)for(let t of e.logPairs)j(g,`Original journal pair: `+e.id+` · speaker `+JSON.stringify(t.speakerKey)+` · text key `+t.textKey,`p`,`record-meta`);j(e,t.player.player.source.archive+` · `+t.player.player.source.path+` · SHA-256 `+t.player.player.source.sha256,`p`,`source`)}async function Di(e){let t=document.createElement(`section`);e.append(t),j(t,`Reading original player and quest state…`);try{let e=await ci(),[n,r]=await Promise.all([fi(e.player),xi()]);if(!t.isConnected)return;t.replaceChildren(),Ei(t,e,n,r)}catch(e){t.isConnected&&(t.replaceChildren(),j(t,`Original player state could not load: `+String(e),`p`,`warnings`))}}var Oi=`{
  "schema": "gothic3-native-clock-output-v1",
  "outputs": [
    {
      "url": "native-clock.json",
      "bytes": 4677,
      "sha256": "267e91892e1b2d328f58caea3608b6de4b1b52f143f558930dd4a55fe5a847cb"
    }
  ],
  "producer": {
    "path": "tools/gothic3/research_native_clock.py",
    "sha256": "476198673c34f59d2c71511a728ae41db8b05019b414a7bcc86998f247e1d09c"
  },
  "helper": {
    "path": "tools/gothic3/research_native_combat.py",
    "sha256": "e03ce4f8045376af81bbad51a16784880e3d1bf2e6d1956633e30edc03a6d3a7"
  },
  "runtime": {
    "path": "src/gothic3/world-clock.ts",
    "sha256": "941e919e7d62703c6d49d8e905f52b41f8b84b484ef2f05befd93ffee8ec7a63"
  },
  "audit": {
    "functionEntries": 60,
    "instructionRecords": 1576,
    "instructionBytes": 5675,
    "allInstructionBytesMatchOriginalPE": true,
    "allSerializedClockPropertyBytesMatch": true,
    "nativeCodeExecuted": false
  },
  "nativeCodeExecuted": false
}
`,ki=.0010000000474974513,Ai=4294967296,ji=-(1n<<63n),Mi=1n<<63n,Ni=e=>Number.isInteger(e)&&e>=0&&e<Ai,Pi=e=>e===24||e===53||e===64,Fi=new DataView(new ArrayBuffer(8));function M(e){if(!Number.isFinite(e))throw Error(`Nonfinite native floating-point operand is unsupported.`);Fi.setFloat64(0,e,!0);let t=Fi.getBigUint64(0,!0),n=t>>63n!=0n,r=Number(t>>52n&2047n),i=t&(1n<<52n)-1n,a=r?1n<<52n|i:i;return{coefficient:n?-a:a,exponent:r?r-1023-52:-1074,negativeZero:a===0n&&n}}var Ii=e=>e<0n?-e:e,Li=e=>e===0n?0:e.toString(2).length;function Ri(e,t){let n=e/t,r=e%t*2n;return r>t||r===t&&(n&1n)==1n?n+1n:n}function zi(e,t,n=-2e4){if(e.coefficient===0n)return e;let r=Ii(e.coefficient),i=Math.max(0,Li(r)-t,n-e.exponent),a=i?Ri(r,1n<<BigInt(i)):r;return{coefficient:e.coefficient<0n?-a:a,exponent:e.exponent+i,negativeZero:a===0n&&e.coefficient<0n}}function Bi(e,t,n){let r=Math.min(e.exponent,t.exponent),i=(e.coefficient<<BigInt(e.exponent-r))+(t.coefficient<<BigInt(t.exponent-r));return zi({coefficient:i,exponent:r,negativeZero:i===0n&&e.negativeZero===!0&&t.negativeZero===!0},n)}function Vi(e,t,n){let r=e.coefficient*t.coefficient;return zi({coefficient:r,exponent:e.exponent+t.exponent,negativeZero:r===0n&&(e.coefficient<0n||e.negativeZero===!0)!=(t.coefficient<0n||t.negativeZero===!0)},n)}function Hi(e,t,n){if(t.coefficient===0n)throw Error(`Native floating-point division by zero is unsupported.`);if(e.coefficient===0n)return{coefficient:0n,exponent:0,negativeZero:e.negativeZero===!0!=t.coefficient<0n};let r=Ii(e.coefficient),i=Ii(t.coefficient),a=Li(r)-Li(i);(a>=0?r<i<<BigInt(a):r<<BigInt(-a)<i)&&a--;let o=n-1-a,s=o>=0?Ri(r<<BigInt(o),i):Ri(r,i<<BigInt(-o));return{coefficient:e.coefficient<0n==t.coefficient<0n?s:-s,exponent:e.exponent-t.exponent-o}}function Ui(e){let t=zi(e,24,-149);if(t.coefficient===0n)return t.negativeZero?-0:0;let n=Math.fround(Number(t.coefficient)*2**t.exponent);if(!Number.isFinite(n))throw Error(`Native float32 overflow/nonfinite exception domain is unsupported.`);return n}function Wi(e){return Ui(M(e))}function Gi(e,t){let n=e|0,r=M(n);return n<0?Bi(r,M(Ai),t):r}function Ki(e){let t=BigInt(Math.trunc(e));if(t<ji||t>=Mi)throw Error(`Native signed64 FISTP overflow/exception state is unsupported.`);return Number(BigInt.asUintN(32,t))}function qi(e){return!!e&&[e.year,e.day,e.hour,e.minute,e.second].every(Ni)}function Ji(e,t){return Ui(Gi(e.second+Math.imul(e.minute+Math.imul(e.hour,60)>>>0,60)>>>0,t))}var Yi=e=>e>=22?3:e>=20?2:e>=8?1:e>=6?0:3;function Xi(e,t){if(!qi(e)||!Pi(t))throw Error(`Known native calendar/precision required.`);return{years:e.year,days:e.day,seconds:Ji(e,t)}}function Zi(e){if(!Ni(e.years)||!Ni(e.days)||!Object.is(e.seconds,Math.fround(e.seconds)))throw Error(`Native time/date storage required.`);let t=Ki(e.seconds);return{year:e.years,day:e.days,hour:Math.floor(t/3600),minute:Math.floor(t%3600/60),second:t%60}}function Qi(e){if(!Ni(e))throw Error(`Native published Hour DWORD required.`);return Yi(e)}function $i(e,t){if(!Ni(e.years)||!Ni(e.days)||!Pi(t))throw Error(`Native weather clock operands required.`);let n=Bi(Hi(M(e.seconds),M(86400),t),Gi(e.days,t),t);return Ui(Bi(Vi(Gi(e.years,t),M(365),t),n,t))}function ea(){return{adjustment:{factor:1,secondsPerDay:86400,daysPerYear:365},timeAndDate:{years:0,days:0,seconds:0},calendar:{year:0,day:0,hour:0,minute:0,second:0},lastTimestamp:0,pendingSeconds:-1,paused:!0}}var ta=class e{timestamps;precisionBits;state=ea();revision=0;transitioning=!1;publishedCalendarBound=!1;constructor(e,t){if(this.timestamps=e,this.precisionBits=t,e.profile!==`selected-host-monotonic-u32-milliseconds`||typeof e.readMilliseconds!=`function`||!Pi(t))throw Error(`An explicit native clock timestamp/precision profile is required.`)}static fromSource(t,n,r){if(t.schema!==`gothic3-world-clock-v1`||t.schemaVersion!==1||!qi(t.calendar)||!/^[a-f0-9]{64}$/.test(t.source?.sha256??``)||!Ni(t.adjustment?.secondsPerDay)||!Ni(t.adjustment?.daysPerYear))throw Error(`Invalid original clock source seed.`);let i=new e(n,r);return i.state.calendar={...t.calendar},i.state.timeAndDate={years:t.calendar.year,days:t.calendar.day,seconds:Ji(t.calendar,r)},i.state.adjustment={factor:Wi(t.factor),secondsPerDay:t.adjustment.secondsPerDay,daysPerYear:t.adjustment.daysPerYear},i}snapshot(){return{revision:this.revision,adjustment:{...this.state.adjustment},timeAndDate:this.timeAndDate(),calendar:this.calendar(),lastTimestamp:this.state.lastTimestamp,pendingSeconds:this.state.pendingSeconds,paused:this.state.paused,arithmetic:{precisionBits:this.precisionBits,rounding:`nearest-even`,capturedNativeEnvironment:!1},timestampProfile:this.timestamps.profile}}timeAndDate(){return{...this.state.timeAndDate}}calendar(){return{...this.state.calendar}}bindPublishedCalendar(e){if(this.transitioning||this.publishedCalendarBound||!qi(e))throw Error(`Native published calendar is invalid, busy or already bound.`);this.state.calendar=e,this.publishedCalendarBound=!0}isPaused(){return this.state.paused}questClock(){return{years:this.state.calendar.year,days:this.state.calendar.day,hours:this.state.calendar.hour}}timestampInSeconds(){let e=this.state.calendar;return e.second+Math.imul(e.minute+Math.imul(e.hour,60)>>>0,60)>>>0}commit(e,t){if(this.transitioning)return{kind:`rejected`,revision:this.revision,reason:`Reentrant native clock transition.`};if(!Number.isSafeInteger(e)||e!==this.revision)return{kind:`rejected`,revision:this.revision,reason:`Native clock revision changed.`};if(this.revision===2**53-1)return{kind:`unsupported`,revision:this.revision,reason:`Clock revision capacity exhausted.`};let n=this.state.calendar,r={...n},i={...this.state,adjustment:{...this.state.adjustment},timeAndDate:{...this.state.timeAndDate},calendar:r};this.transitioning=!0;try{let e=t(i);return i.calendar!==r&&Object.assign(n,i.calendar),i.calendar=n,this.state=i,this.revision++,{kind:`applied`,revision:this.revision,value:e}}catch(e){return{kind:`unsupported`,revision:this.revision,reason:String(e)}}finally{this.transitioning=!1}}adjust(e,t=this.revision){return this.commit(t,t=>{if(!Ni(e.secondsPerDay)||!Ni(e.daysPerYear))throw Error(`Clock divisors must be native uint32 values.`);return t.adjustment={...e,factor:Wi(e.factor)},{...t.adjustment}})}set(e,t=this.revision){return this.commit(t,t=>{if(!Ni(e.years)||!Ni(e.days))throw Error(`Clock years/days must be native uint32 values.`);return t.timeAndDate={years:e.years,days:e.days,seconds:Wi(e.seconds)},t.pendingSeconds=-1,{...t.timeAndDate}})}pause(e=this.revision){return this.commit(e,e=>(e.paused=!0,e.pendingSeconds=-1,!0))}resume(e=this.revision){return this.commit(e,e=>(e.paused=!1,!1))}advance(e){let t=this.precisionBits,n=[],r=()=>{let e=this.timestamps.readMilliseconds();if(!Ni(e))throw Error(`Timestamp host did not return uint32 milliseconds.`);return n.push(e),e};e.pendingSeconds===-1&&(e.lastTimestamp=r(),e.pendingSeconds=0),e.paused||(e.pendingSeconds=Ui(Bi(M(Ui(Vi(Vi(Gi(r()-e.lastTimestamp>>>0,t),M(e.adjustment.factor),t),M(ki),t))),M(e.pendingSeconds),t)),e.lastTimestamp=r());let i=e.timeAndDate;i.seconds=Ui(Bi(M(i.seconds),M(e.pendingSeconds),t)),e.pendingSeconds=0;let a=Ki(i.seconds),{secondsPerDay:o,daysPerYear:s}=e.adjustment;if(o===0||s===0)throw Error(`Native unsigned calendar division by zero is unsupported.`);let c=Math.floor(a/o),l=Math.imul(o,c)>>>0,u=i.days+c>>>0,d=Math.floor(u/s),f=Gi(l,t);return i.seconds=Ui(Bi(M(i.seconds),{...f,coefficient:-f.coefficient,negativeZero:f.coefficient===0n&&f.negativeZero!==!0},t)),i.years=i.years+d>>>0,i.days=u-Math.imul(s,d)>>>0,{date:{...i},samples:n}}getTimeAndDate(e=this.revision){return this.commit(e,e=>this.advance(e).date)}process(e=this.revision){return this.commit(e,e=>{let{date:t,samples:n}=this.advance(e),r=Yi(this.state.calendar.hour),i=Ki(t.seconds);e.calendar={year:t.years,day:t.days,hour:Math.floor(i/3600),minute:Math.floor(i%3600/60),second:i%60};let a=Yi(e.calendar.hour),o=Bi(Hi(M(t.seconds),M(86400),this.precisionBits),Gi(t.days,this.precisionBits),this.precisionBits),s=[{kind:`weatherCurrentDayTime`,days:Ui(Bi(Vi(Gi(t.years,this.precisionBits),M(365),this.precisionBits),o,this.precisionBits)),when:`if-weather-admin-exists`}];return r!==a&&s.push({kind:`musicDayTime`,tableIndex:a,when:`if-music-module-exists`},{kind:`ambientDayTime`,value:a,when:`if-ambient-module-exists`}),{timeAndDate:t,calendar:{...e.calendar},timestampSamples:n,previousDayTime:r,dayTime:a,consumers:s}})}};function na(e){let t=-1/0;return{profile:`selected-host-monotonic-u32-milliseconds`,readMilliseconds:()=>{let n=e();if(!Number.isFinite(n)||n<0||n<t||!Number.isSafeInteger(Math.trunc(n)))throw Error(`Clock host must supply finite, nonnegative, monotonic milliseconds.`);return t=n,Math.trunc(n)%Ai}}}async function ra(){let e=JSON.parse(Oi),t=e.outputs?.find(e=>e.url===`native-clock.json`);if(e.schema!==`gothic3-native-clock-output-v1`||e.nativeCodeExecuted!==!1||!t)throw Error(`Invalid native clock output receipt.`);let n=await _r(`clock/`+t.url,t);if(n.schema!==`gothic3-native-world-clock-v1`||n.schemaVersion!==1||n.millisecondsToSeconds!==ki||n.arithmeticProfiles?.selectionRequired!==!0||n.arithmeticProfiles.capturedNativeControlWord!==!1||n.arithmeticProfiles.rounding!==`nearest-even`)throw Error(`Unsupported native clock document.`);return n}async function ia(e,t){let n=await ra(),r=await Mr.manifest(),i=r.initial.worldClock,a=r.outputs.find(e=>e.path===i);if(!i||!a||`gameplay/`+i!==n.sourceSeed.url||a.bytes!==n.sourceSeed.bytes||a.sha256!==n.sourceSeed.sha256)throw Error(`Current gameplay seed differs from the clock source receipt.`);let o=await Mr.read(i);return ta.fromSource(o,e,t)}async function aa(e,t){let n=document.createElement(`section`);e.append(n);let r=()=>t.aborted||!n.isConnected;n.textContent=`Reading original clock…`;try{let e=await ia(na(()=>performance.now()),24);if(r())return;n.replaceChildren();let i=document.createElement(`p`);i.textContent=`Run an isolated copy of the original world clock. It starts paused at noon, with 12 game seconds per real second. NPCs, quests, weather and audio are not advanced by this view.`;let a=document.createElement(`p`);a.setAttribute(`aria-label`,`Original clock calendar`);let o=document.createElement(`p`),s=document.createElement(`p`),c=document.createElement(`p`);c.className=`warnings`;let l=document.createElement(`div`);l.className=`landscape-choices`;let u=document.createElement(`button`);u.textContent=`Run clock`;let d=document.createElement(`button`);d.textContent=`Pause clock`;let f=document.createElement(`button`);f.textContent=`Read next clock frame`;let p=document.createElement(`button`);p.textContent=`Reset clock`,l.append(u,d,f,p);let m=document.createElement(`p`);m.textContent=`This instance selects the native FPUAdmin default of 24-bit arithmetic and the browser’s monotonic millisecond counter. The running native game’s FPU control word was not captured. Its calendar values feed quest timestamps only after a complete session is integrated.`,n.append(i,a,o,s,c,l,m);let h=[],g=!1,_=null;function v(){e.pause(),_!==null&&window.clearInterval(_),_=null,t.removeEventListener(`abort`,v),u.disabled=d.disabled=f.disabled=p.disabled=!0}function y(){let t=e.snapshot(),n=t.calendar,r=[n.hour,n.minute,n.second].map(e=>String(e).padStart(2,`0`)).join(`:`);a.textContent=`Year `+n.year+` · Day `+n.day+` · `+r,o.textContent=(t.paused?`Paused`:`Running`)+` · factor `+t.adjustment.factor+` · seconds within day `+t.timeAndDate.seconds,s.textContent=h.length?`Unapplied clock notifications: `+h.map(e=>e.kind).join(` → `):`Clock notifications have not been executed.`,u.disabled=g||!t.paused,d.disabled=g||t.paused,f.disabled=g,p.disabled=g}function ee(){if(r()){v();return}let t=e.process();t.kind===`applied`?(h=t.value.consumers,c.textContent=``):(c.textContent=`Clock stopped: `+t.reason,e.pause()),y()}u.onclick=()=>{if(r())return;let t=e.resume();t.kind===`applied`?ee():c.textContent=t.reason,y()},d.onclick=()=>{if(r())return;let t=e.pause();t.kind!==`applied`&&(c.textContent=t.reason),y()},f.onclick=()=>ee(),p.onclick=()=>{r()||(g=!0,e.pause(),y(),ia(na(()=>performance.now()),24).then(t=>{r()||(e=t,h=[],c.textContent=``)}).catch(e=>{r()||(c.textContent=`Clock reset could not load: `+String(e))}).finally(()=>{g=!1,r()||y()}))},t.addEventListener(`abort`,v,{once:!0}),_=window.setInterval(()=>{if(r()){v();return}!g&&!e.isPaused()&&ee()},250),y()}catch(e){r()||(n.textContent=`Original clock could not load: `+String(e))}}var oa=`{
  "schema": "gothic3-entity-reflection-rules-v1",
  "inputs": {
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214",
    "Engine": "d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3",
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f"
  },
  "objectVersion": 83,
  "propertyVersion": 30,
  "clockVersion": 1,
  "clockPropertyType": 32,
  "clockWrapperVtable": "20685bc4",
  "clockNativeVtable": "206858fc",
  "clockFields": [
    {
      "name": "Year",
      "nativeOffset": 20,
      "typeName": "long",
      "descriptor": "207bd3a0",
      "registrar": "Game:204fc6c0",
      "reader": "Game:2020a700"
    },
    {
      "name": "Day",
      "nativeOffset": 24,
      "typeName": "long",
      "descriptor": "207bd3c4",
      "registrar": "Game:204fc760",
      "reader": "Game:2020a700"
    },
    {
      "name": "Hour",
      "nativeOffset": 28,
      "typeName": "long",
      "descriptor": "207bd3e8",
      "registrar": "Game:204fc800",
      "reader": "Game:2020a700"
    },
    {
      "name": "Minute",
      "nativeOffset": 32,
      "typeName": "long",
      "descriptor": "207bd40c",
      "registrar": "Game:204fc8a0",
      "reader": "Game:2020a700"
    },
    {
      "name": "Second",
      "nativeOffset": 36,
      "typeName": "long",
      "descriptor": "207bd430",
      "registrar": "Game:204fc940",
      "reader": "Game:2020a700"
    },
    {
      "name": "Factor",
      "nativeOffset": 40,
      "typeName": "float",
      "descriptor": "207bd454",
      "registrar": "Game:204fc9e0",
      "reader": "Game:2020afa0"
    }
  ],
  "clockRegistryInitializer": {
    "address": "205b770c",
    "bytes": "60c64f20c0c64f2060c74f2000c84f20a0c84f2040c94f20e0c94f20"
  },
  "inheritedEntityPropertyTableEmpty": true,
  "supportedProfile": "successful-allocation; canonical bool; ASCII names; nonpanic creator cleanup; finite float32; detached Clock construction",
  "unresolved": [
    "Other native property-set clone/constructor/default/Create/Read effects",
    "Obsolete/mismatched property lazy descriptor/critical section branch",
    "Last wrapper release deleting destructor and memory admin deletion",
    "Full entity context load/template patch/world residency"
  ]
}
`,sa=`{
  "schema": "gothic3-entity-reflection-manifest-v1",
  "outputs": [
    {
      "path": "serialized-candidates.json",
      "bytes": 1503875,
      "sha256": "d63e8c90b57bf6ce3214aa54f5d1956cacd8e9ec9c80caff817ddd4b5e48bfb2"
    },
    {
      "path": "native-property-schemas.json",
      "bytes": 342817,
      "sha256": "8bca10dc20bca96af898f89f8ea5737d5e2b7acea17ac69f2d1144d0c6a551dc"
    },
    {
      "path": "native-evidence.json",
      "bytes": 4371013,
      "sha256": "1da029301b4aa259272826575d331fcd5a860e7f32e741ca252479cea999387c"
    }
  ]
}
`,ca=`{
  "schema": "gothic3-entity-reading-rules-v1",
  "inputs": {
    "Engine": "d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3",
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214",
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f"
  },
  "entityVersion": 83,
  "sentinel": 3735929054,
  "sourceOrder": [
    "Node.Read",
    "Enable",
    "EnableRendering",
    "DisableProcessing",
    "flag bit5",
    "flag bit10 and Modified",
    "EnablePicking(false)",
    "EnableCollision",
    "SetRenderAlphaValue(recursive=true)",
    "insertType bits14..17 and Modified",
    "lastRenderPriority and Modified",
    "Lock",
    "flags bit25/bit13",
    "SetName",
    "world/local matrices; tree/local/world boxes; two spheres",
    "LOD factor; flagbit22; cull factor; timestamp scratch; scaling; flags27/28",
    "RemoveAllPropertySets",
    "signed-count accessor loop with DEADC0DE sentinel",
    "local/world/tree box validity bits19/20/21",
    "virtual OnPostRead",
    "restore source timestamp DWORD130",
    "overwrite scaling DWORD134 from world matrix"
  ],
  "rawOffsets": {
    "flags": 60,
    "worldMatrix": 64,
    "localMatrix": 128,
    "treeBox": 192,
    "localBox": 272,
    "worldBox": 232,
    "worldSphere": 216,
    "localSphere": 256,
    "visualLodFactor": 296,
    "objectCullFactor": 300,
    "modifiedWord": 304,
    "uniformScaling": 308,
    "name": 312
  },
  "scope": "Exact ReadV83 controller over one live entity and ordered native accessor host",
  "remaining": [
    "reflective class factory/constructor/Create/Read implementations",
    "dynamic/spatial read wrapper and template patching",
    "native rendering/cache/collision effects of entity setters",
    "class-specific PostRead and active world-context residency"
  ]
}
`,la=`{
  "schema": "gothic3-entity-lifecycle-rules-v1",
  "inputs": {
    "Engine": "d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3",
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f",
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214"
  },
  "propertyOwnerOffset": 12,
  "propertyAddedBeforeAppend": true,
  "propertyIDEqualityBytes": 16,
  "propertyTypes": {
    "gCNavigation_PS": 5,
    "gCNavPath_PS": 10,
    "gCNPC_PS": 30,
    "gCInventory_PS": 31,
    "gCScriptRoutine_PS": 45,
    "gCInteraction_PS": 49,
    "gCDamage_PS": 51,
    "gCDamageReceiver_PS": 52,
    "gCFocus_PS": 59,
    "gCPlayerMemory_PS": 60,
    "gCDialog_PS": 68,
    "eCIlluminated_PS": 74,
    "gCParty_PS": 77,
    "gCEffect_PS": 96,
    "eCVisualAnimation_PS": 100,
    "gCCharacterMovement_PS": 21
  },
  "entity": {
    "constructorReferenceWord": 1,
    "validity": "eCNode::IsValid checks first16 PropertyID bytes, independently of referenceWord high bit",
    "baseEntityCreate": "reference high bit, frustum backpointer, property-type comparator; spatial Create override excluded",
    "registration": "SceneAdmin first table overwrite by first16 ID; erase by key regardless of stored pointer",
    "storedIdentityRead": "unregister old ID -> stream consume20/copy16/clear trailingDWORD -> register new ID",
    "onReadContent": "all four audited entity classes inherit empty eCNode::OnReadContent"
  },
  "propertyBase": {
    "constructorReferenceWord": 1,
    "constructorFlagBit0": true,
    "virtualValidity": "base reference high bit, NOT serialized flag bit0",
    "read": "version>1 reads flagbit0 bool; otherwise sets true; derived reads are separate"
  },
  "navPath": {
    "vtable": "2068f414",
    "inheritedNotifications": true,
    "currentReadVersion": 39,
    "constructor": "Game20017b34->20298600, Game20005358 transient Invalidate; source arrays/margins are separate",
    "constructorObjectOffsets": {
      "mean0": "0xbc",
      "maximumMinus1": "0xc0",
      "minimumMinus1": "0xc4",
      "dirtyByte1": "0xb8",
      "zeroFields": [
        "0x10c",
        "0x110",
        "0xc8"
      ]
    },
    "read": "version39 consumes only derived u16; legacy migration excluded",
    "added": "non-template map pointer registration, then inverse current owner world matrix, then empty Engine base",
    "worldMatrixAdapter": "path.worldMatrix aliases the exact stable mutable embedded live-owner matrix, never a serialized snapshot; CalcPathHeights2003014d rereads it on a cache miss",
    "postRead": "GameReset202983f0 clears DCC pointers and owner proxy, sets byteb8=1, leaves height cachesbc/c0/c4 unchanged; version39 skips legacy migration",
    "heightCacheIdentity": "rawbc/c0/c4 readers alias navigation path.heights; null represents constructor0/-1/-1"
  },
  "dynamicGraph": {
    "attachFreshChild": "assign parent, recursive SetContext, AddReference, append",
    "setGraph": "AddReference argument, ReleaseReference old/clear, SetContext argument, assign",
    "contextIsResidency": false
  },
  "sourceCandidatesAreLiveEntities": false,
  "remaining": [
    "Full context construction: selected candidate exports omit other original nodes and cannot instantiate a complete context graph.",
    "Reflective object/accessor factory, complete class constructors/Create/Read and each class-specific OnPostRead override.",
    "Entity ReadV83 field setters and full template patching after dynamic Read; no bulk source-value copying substitutes for callbacks.",
    "PVS/cache-in, sector activation, ChildrenAvailable, physical collision/movement and processing-range traversal.",
    "SceneAdmin spatial/template tables and exact proxy lifetime/destruction hosts.",
    "Native GE_MESSAGEF_WARN missing-property-object branch and fatal already-owned-PS error observers.",
    "Existing-parent MoveToNode, spatial graph override, equal-type native qsort order, sorted AddPropertySet(true), PS type0/4 reflective-name lookup.",
    "Native multithread critical-section scheduling and x87 bit equivalence."
  ],
  "evidence": {
    "path": "native-evidence.json",
    "sha256": "106d25de9d13ba60ebba845eb272341c0407d608584468508e0e6306c684b93e"
  }
}
`,ua=`{
  "schema": "gothic3-entity-lifecycle-manifest-v1",
  "inputs": {
    "Engine": "d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3",
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f",
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214"
  },
  "sourceCandidates": {
    "path": "source-candidates.json.gz",
    "bytes": 1906531,
    "sha256": "b840e64d234351fcda5311cc58a018e86890c3a5c07ecec8b0834a724cfc3f2c",
    "encoding": "gzip",
    "uncompressedBytes": 17749501,
    "uncompressedSha256": "314e53da18bd7fa3266954c2f7c573b028c42b6caa6cb9157693c4091fcc950b"
  },
  "sourceCandidatesAreLiveEntities": false,
  "originalResourceReceipt": {
    "path": "assets/gothic3/entity-lifecycle/original-resources.json",
    "bytes": 148551,
    "sha256": "e6f2e209d0f47ed260edea734ed38d140993e967b45f9efab227dff906e0677e"
  },
  "nativeCodeExecuted": false,
  "runtimeActivationAsserted": false
}
`,da=JSON.parse(`{
  "schema": "gothic3-native-properties-rules-v1",
  "inputs": {
    "Engine": "d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3",
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214",
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f"
  },
  "modifiedWordOffset": 304,
  "defaultModifiedWord": 4294967295,
  "ownerOffset": 12,
  "dispatchOffsets": [
    76,
    80
  ],
  "ownerModifiedIsReadOnly": true,
  "profiles": {
    "gCScriptRoutine_PS": {
      "customExit": null,
      "vtable": "2069c754"
    },
    "gCPlayerMemory_PS": {
      "customExit": null,
      "vtable": "2069845c"
    },
    "gCNPC_PS": {
      "customExit": "Enclave proxy SetEntity unless propagated",
      "vtable": "2069668c"
    }
  },
  "propertyID": {
    "storageBytes": 20,
    "equalityBytes": 16,
    "assignmentCopiesBytes": 16,
    "assignmentClearsTrailingDWORD": true
  },
  "proxySetEntity": "Compare PropertyID first16 bytes; equal leaves internal reference intact; otherwise copy ID/clear tail, ReleaseReference when nonnull, then clear internal pointer",
  "evidence": {
    "path": "native-evidence.json",
    "sha256": "df74e089009e66ec12f7ca23e021003233929aef66d0617f5675c6c8a46ac619"
  },
  "remaining": [
    "full entity create/read/world lifecycle",
    "nonnull proxy internal ReleaseReference and final destruction host",
    "notification overrides of other property-set classes"
  ]
}
`);if(da.schema!==`gothic3-native-properties-rules-v1`||da.inputs.Engine!==`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`||da.inputs.Game!==`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`||da.inputs.SharedBase!==`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`||da.modifiedWordOffset!==304||da.ownerOffset!==12||da.dispatchOffsets.join(`,`)!==`76,80`||da.defaultModifiedWord!==4294967295||da.profiles.gCScriptRoutine_PS?.customExit!==null||da.profiles.gCPlayerMemory_PS?.customExit!==null||da.profiles.gCNPC_PS?.customExit!==`Enclave proxy SetEntity unless propagated`||da.propertyID.storageBytes!==20||da.propertyID.equalityBytes!==16||da.propertyID.assignmentCopiesBytes!==16||da.propertyID.assignmentClearsTrailingDWORD!==!0)throw Error(`Original property notification rule receipt differs`);function fa(e){if(!/^[0-9a-f]{40}$/.test(e))throw TypeError(`Expected 20 original PropertyID bytes as lowercase hex`);return e}var pa=class e{id;internal;constructor(e,t){this.id=fa(e),this.internal=t}static fromConstructor(){return new e(`0000000000000000000000000000000000000000`,null)}propertyID(){return this.id}clearEntityPointer(e){let t=this.internal;if(t!==null){e(`proxy-release-reference`,t.identity);let n=t.releaseReference();if(!n.known)throw Error(`Entity-pointer proxy ReleaseReference: `+n.reason);this.internal=null,e(`proxy-internal-clear`,null)}this.internal=null,e(`proxy-internal-clear`,null),this.id=`0000000000000000000000000000000000000000`,e(`proxy-id-destroy`,this.id)}setEntity(e,t){if(fa(e),e.slice(0,32)===this.id.slice(0,32))return;this.id=e.slice(0,32)+`00000000`,t(`proxy-id-copy`,this.id);let n=this.internal;if(n!==null){t(`proxy-release-reference`,n.identity);let e=n.releaseReference();if(!e.known)throw Error(`Enclave proxy ReleaseReference: `+e.reason);this.internal=null,t(`proxy-internal-clear`,null)}}},ma=class{identity;kind;values;owner;npcEnclaveProxy;blocked=null;constructor(e,t,n,r,i=null){if(this.identity=e,this.kind=t,this.values=n,this.owner=r,this.npcEnclaveProxy=i,!e||![`gCScriptRoutine_PS`,`gCPlayerMemory_PS`,`gCNPC_PS`].includes(t)||t===`gCNPC_PS`!=(i!==null))throw TypeError(`Supply the audited property-set class and its original NPC proxy when required`)}failure(){return this.blocked}notify(e,t,n){return this.run(e,t,n,!0)}onNotify(e,t,n){return this.run(e,t,n,!1)}run(e,t,n,r){let i=[],a=!1,o=(n,r)=>{i.push({operation:n,phase:e,property:t,value:r}),(n===`proxy-id-copy`||n===`proxy-release-reference`)&&(a=!0)};try{if(this.blocked)throw Error(this.blocked);if(e!==`enter`&&e!==`exit`||typeof t!=`string`||t.includes(`\0`)||typeof n!=`boolean`)throw TypeError(`An original property name, phase and propagation flag are required`);let a=()=>{let n=this.owner;n!==null&&i.push({operation:`owner-modified-read`,phase:e,property:t,owner:n.identity,value:n.modified()})};if(r&&(a(),i.push({operation:`virtual-on-notify`,phase:e,property:t,value:e===`enter`?76:80})),this.kind===`gCNPC_PS`&&e===`exit`&&!n&&t===`Enclave`){let e=this.values.Enclave;if(typeof e!=`string`)throw TypeError(`NPC Enclave must be its original 20-byte PropertyID`);this.npcEnclaveProxy.setEntity(e,o)}return a(),i.push({operation:`shared-base-return`,phase:e,property:t,value:!0}),{supported:!0,nativeReturnValue:!0,trace:i}}catch(e){let t=e instanceof Error?e.message:String(e);return a&&(this.blocked=t),{supported:!1,nativeReturnValue:null,reason:t,partial:a,trace:i}}}},ha=`{
  "schema": "gothic3-navigation-scene-manifest-v1",
  "mapSourceSha256": "1b163f4f1be7115aeef37835e798772a3437db3429a32b4d36d866437b9a41c3",
  "inputs": {
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f",
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214"
  },
  "queryMap": {
    "path": "query-map.json.gz",
    "sha256": "e566a0bea381f3614260878e735bee093429b0785c1c818831b67887e0d67e48",
    "bytes": 784638,
    "uncompressedSha256": "a50d444132fd111d0eca0bb890dd6f953376002b1b48e3a34e324db8bfd55f43",
    "uncompressedBytes": 2614450,
    "encoding": "gzip"
  },
  "definitions": {
    "path": "entity-definitions.json.gz",
    "sha256": "ca2f884b10c38a619a751a6d70ba0a95b4fa247c374819e1659d5be40e394ff0",
    "bytes": 1554732,
    "uncompressedSha256": "f6ae0d56e6444c0756b347003c70d90081fd5c9451ccabb0ae445b8adef08b92",
    "uncompressedBytes": 7635825,
    "encoding": "gzip"
  },
  "storedLists": {
    "path": "map-lists.json.gz",
    "sha256": "8ad7e6609f1c48913cb9abcabdcde7a9cdf9ad910191cdd993824ad5429526b1",
    "bytes": 9519794,
    "uncompressedSha256": "0605d8867ef6e4779165cf58277d0708bc2604c909dbf0406572a8c71744d304",
    "uncompressedBytes": 60800718,
    "encoding": "gzip"
  },
  "counts": {
    "grid": 49,
    "negativeZones": 694,
    "collisionCircles": 73898,
    "preferredPaths": 195,
    "zoneObjects": 2226,
    "collisionCircleOverlaps": 73898,
    "pathIntersections": 3159,
    "interactionAssignments": 35994,
    "networkObjects": 5385,
    "networkLinks": 6317,
    "waypoints": 6317,
    "sourceEntities": 5385,
    "unresolvedMapPropertyIds16": 0,
    "duplicateGuidCandidates": 0
  },
  "limitations": [
    "Source candidates do not prove live entity registration, sector residency or runtime activation.",
    "Stored original map loading is supported; forced recompilation, AIZone inheritance and door bindings remain separate dependencies.",
    "Network/obstacle lists are preserved, but this does not implement path search, collision avoidance or character physics.",
    "JS arithmetic models native float stores, not bit-identical x87 extended arithmetic at boundaries."
  ]
}
`,ga=`1b163f4f1be7115aeef37835e798772a3437db3429a32b4d36d866437b9a41c3`,_a=`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`,va=`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`,ya=JSON.parse(ha);if(ya.schema!==`gothic3-navigation-scene-manifest-v1`||ya.mapSourceSha256!==ga||ya.inputs.Game!==_a||ya.inputs.SharedBase!==va)throw Error(`Unsupported original navigation-scene receipt`);for(let e of[ya.queryMap,ya.definitions,ya.storedLists])if(!/^[a-z-]+\.json\.gz$/.test(e.path)||!/^[a-f0-9]{64}$/.test(e.sha256)||!Number.isSafeInteger(e.bytes)||e.bytes<1)throw Error(`Invalid navigation resource receipt`);var ba=JSON.parse(la);if(ba.schema!==`gothic3-entity-lifecycle-rules-v1`||ba.inputs.Game!==`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`||ba.inputs.Engine!==`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`||ba.inputs.SharedBase!==`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`||ba.propertyOwnerOffset!==12||ba.propertyAddedBeforeAppend!==!0||ba.propertyIDEqualityBytes!==16||ba.navPath.vtable!==`2068f414`||ba.navPath.inheritedNotifications!==!0||ba.navPath.currentReadVersion!==39)throw Error(`Unsupported original entity-lifecycle receipt`);var xa=e=>({known:!0,value:e});function Sa(e,t=32){if(!Number.isInteger(e)||e<0||e>(t===32?4294967295:2**t-1))throw TypeError(`Expected native uint`+t);return e}function Ca(e,t,n){Sa(e.value),Sa(e.knownMask),Sa(t),Sa(n),e.value=(e.value&~t|n&t)>>>0,e.knownMask=(e.knownMask|t)>>>0}var wa=class{identity;className;propertyType;values;owner;wrapper;callbacks;processable;setEntityOverride;referenceWord=1;baseFlags={value:1,knownMask:15};constructor(e,t,n,r,i,a,o,s,c){if(this.identity=e,this.className=t,this.propertyType=n,this.values=r,this.owner=i,this.wrapper=a,this.callbacks=o,this.processable=s,this.setEntityOverride=c,!e||!t||t.includes(`\0`)||n<0||n>127)throw TypeError(`Original pointer/class/PS type0..127 required.`);Sa(n)}setEntity(e){return this.setEntityOverride?this.setEntityOverride(e):(this.owner.write(e),xa(void 0))}isValid(){return!!(Sa(this.referenceWord)&2147483648)}createBase(){return this.referenceWord=(Sa(this.referenceWord)|2147483648)>>>0,1}readBase(e,t){if(Sa(e,16),e>1&&typeof t!=`boolean`)throw TypeError(`Base Read needs its serialized bool.`);return Ca(this.baseFlags,1,e>1?Number(t):1),1}},Ta=JSON.parse(ua);if(Ta.schema!==`gothic3-entity-lifecycle-manifest-v1`||Object.entries(ba.inputs).some(([e,t])=>Ta.inputs[e]!==t)||Ta.sourceCandidatesAreLiveEntities!==!1||Ta.sourceCandidates.path!==`source-candidates.json.gz`)throw Error(`Unsupported original lifecycle source receipt`);var Ea=JSON.parse(ca);if(Ea.schema!==`gothic3-entity-reading-rules-v1`||Ea.entityVersion!==83||Ea.sentinel!==3735929054||Ea.inputs.Game!==`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`||Ea.inputs.Engine!==`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`||Ea.inputs.SharedBase!==`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`)throw Error(`Original entity read receipt differs`);var Da=class{bytes;strings;end;view;position;constructor(e,t,n=0,r=e.byteLength){if(this.bytes=e,this.strings=t,this.end=r,!Number.isSafeInteger(n)||!Number.isSafeInteger(r)||n<0||r<n||r>e.byteLength)throw Error(`Invalid native entity stream bounds`);this.position=n,this.view=new DataView(e.buffer,e.byteOffset,e.byteLength)}cursor(){return this.position}offset(e){if(!Number.isSafeInteger(e)||e<0||this.position+e>this.end)throw Error(`Original entity stream is truncated at `+this.position);let t=this.position;return this.position+=e,t}u8(){return this.view.getUint8(this.offset(1))}u16(){return this.view.getUint16(this.offset(2),!0)}u32(){return this.view.getUint32(this.offset(4),!0)}bool(){let e=this.u8();if(e!==0&&e!==1)throw Error(`Noncanonical original bool byte is outside this profile`);return e===1}f32(){let e=this.view.getFloat32(this.offset(4),!0);if(!Number.isFinite(e))throw Error(`Nonfinite original entity field is outside this profile`);return e}take(e){let t=this.offset(e);return this.bytes.subarray(t,t+e)}propertyID(){return[...this.take(20)].map(e=>e.toString(16).padStart(2,`0`)).join(``)}string(){let e=this.u16(),t=this.strings[e];if(typeof t!=`string`)throw Error(`Original indexed string is absent: `+e);return t}},Oa=`{
  "schema": "gothic3-clock-properties-rules-v1",
  "inputs": {
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f",
    "Engine": "d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3",
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214"
  },
  "profile": "one-physical-original-gCClock_PS-finite-explicit-clock-profile",
  "vtable": "206858fc",
  "propertyOffsets": {
    "Year": 20,
    "Day": 24,
    "Hour": 28,
    "Minute": 32,
    "Second": 36,
    "Factor": 40
  },
  "propertyType": 32,
  "isProcessable": true,
  "embeddedClockOffset": 44,
  "scratchOffsets": {
    "years": 80,
    "days": 84,
    "seconds": 88
  },
  "secondsPerDay": 86400,
  "daysPerYear": 365,
  "musicStringsBase": "207bd478",
  "ambientDayTime": [
    0,
    1,
    2,
    3
  ],
  "constructor": {
    "baseReferenceWord": 1,
    "scratch": {
      "years": 0,
      "days": 0,
      "seconds": 0
    },
    "clock": "constructor then Set zero",
    "propertyValuesWrittenByConstructor": false,
    "PostInitializeProperties": {
      "Year": 0,
      "Day": 0,
      "Hour": 0,
      "Minute": 0,
      "Second": 0,
      "Factor": 12
    },
    "postInitializeDoesNotAdjustEmbeddedClock": true
  },
  "physicalBinding": "lowercase calendar accessor view aliases exact existing Uppercase value storage; one binding per clock and values object",
  "setters": "NotifyEnter(name,false); property write; NotifyExit(name,false); no direct Process publication",
  "notifications": {
    "outer": "owner.Modified read; virtual OnNotify",
    "inheritedEnterExit": "owner.Modified read; SharedBase true",
    "nonpropagatedClockExit": [
      "scratch.seconds from wrapping calendar seconds",
      "scratch.days from Day",
      "scratch.years from Year",
      "bCClock.Set(same scratch)",
      "read current Factor",
      "bCClock.Adjust",
      "inherited Engine Exit"
    ],
    "propagatedClockExit": "inherited Engine Exit only",
    "propertyFilter": null
  },
  "Read": "consume arbitrary uint16 version; direct virtual OnNotifyExit(NULL,false); return1; no inherited base.Read call",
  "Create": "if invalid, Pause then base.Create highbit; return1",
  "Invalidate": "scratch.seconds=0; days=0; years=0; bCClock.Set; property fields and adjustment remain",
  "processOrder": [
    "base.OnProcess(empty)",
    "bCClock.GetTimeAndDate(same scratch)",
    "capture old property Hour after advancing read",
    "classify old and new uint32 Hour",
    "direct publication Year/Day/Hour/Minute/Second without Notify",
    "weather float32 computation, regardless of module existence",
    "GetWeatherAdmin",
    "SetCurrentDayTime if nonnull",
    "if daytime changed capture AmbientModule then MusicModule",
    "Music.SetDayTime if captured music nonnull",
    "Ambient.SetDayTime if captured ambient nonnull"
  ],
  "weatherSetter": "Engine3004070f->305a7ea0 direct storedfloat32 write admin+0x30; actual supplied storage wrapper available",
  "hostConsumerContracts": {
    "moduleGetters": "original IsInitialised gate then static cached FindModule/RTDynamicCast effect; unknown is not null",
    "music": "captured module pointer and exact live global bCString reference; full native music system/sequencer/trigger subcalls are host work",
    "ambient": "captured module pointer and enum; full native system/sequencer/property-container/notification subcalls are host work"
  },
  "arithmeticProfile": {
    "precisionBits": [
      24,
      53,
      64
    ],
    "rounding": "nearest-even",
    "capturedNativeControlWord": false,
    "timestamps": "selected monotonic u32 milliseconds, fewer than2^32ms between related reads; no timestamp callback reentrant clock mutation",
    "finiteOnly": true,
    "nativeFPUExceptionEnvironmentPorted": false
  },
  "lifetimeProfile": "stable live concrete Clock_PS and physical plain data storage during a call; owner slot may be reread; reentrant consumer setters permitted, recursive OnProcess unsupported",
  "remaining": [
    "full original reflective construction/deserialization/entity scheduling",
    "original module lookup/cache/app registration services",
    "music and ambient systems, sequencers and trigger payload consumers",
    "live contents of global music daytime strings",
    "savegame clock baseline restoration and copy/destructor paths",
    "captured active native x87 environment and exceptions"
  ],
  "audit": {
    "functionEntries": 150,
    "instructionRecords": 1045,
    "matchedInstructionBytes": 3436,
    "allListedInstructionBytesMatchOriginalPE": true,
    "selectedFunctionScopeOnly": true,
    "nativeCodeExecuted": false,
    "testsExecuted": false,
    "buildExecuted": false,
    "browserExecuted": false
  }
}
`,ka=`{
  "schema": "gothic3-clock-properties-manifest-v1",
  "seed": {
    "path": "serialized-clock.json",
    "bytes": 686,
    "sha256": "e382d21f54eae7694eb9cb23e9a980c4db83b4e4ba3e27d9b2740ac006f756da"
  },
  "rules": {
    "path": "public/gothic3/clock-properties/runtime-rules.json",
    "bytes": 4768,
    "sha256": "0a5e8ffb3dd8ef74fa0091158ad23b63835813ea5ae2922e77973b1408856e15"
  },
  "nativeEvidence": {
    "path": "assets/gothic3/clock-properties/native-evidence.json",
    "bytes": 287715,
    "sha256": "dc625198d76cb2e9a6de4fb1a226b4cc5cc0561c95ae129760d537edf5f37d11"
  },
  "seedEvidence": {
    "path": "assets/gothic3/clock-properties/seed-evidence.json",
    "bytes": 5745,
    "sha256": "198e2a3505e8d7193f6ae63781d33900f672b9d28dac25ac4a962a018138cc1a"
  },
  "audit": {
    "functionEntries": 150,
    "instructionRecords": 1045,
    "matchedInstructionBytes": 3436,
    "allListedInstructionBytesMatchOriginalPE": true,
    "selectedFunctionScopeOnly": true,
    "nativeCodeExecuted": false,
    "testsExecuted": false,
    "buildExecuted": false,
    "browserExecuted": false
  }
}
`,Aa=JSON.parse(Oa);if(Aa.schema!==`gothic3-clock-properties-rules-v1`||Aa.vtable!==`206858fc`||Aa.inputs.Game!==`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`||Aa.inputs.Engine!==`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`||Aa.inputs.SharedBase!==`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`||Aa.secondsPerDay!==86400||Aa.daysPerYear!==365||Aa.musicStringsBase!==`207bd478`||Aa.ambientDayTime.join(`,`)!==`0,1,2,3`||Aa.propertyOffsets.Hour!==28)throw Error(`Original Clock_PS property receipt differs.`);var ja=e=>({known:!0,value:e});function Ma(e,t){if(!e?.known)throw Error(t+`: `+(e?.reason??`original dependency is unresolved`));return e.value}function N(e,t){if(!Number.isInteger(e)||e<0||e>4294967295)throw TypeError(t+` requires uint32.`);return e}function Na(e,t){if(!Number.isFinite(e)||!Object.is(e,Math.fround(e)))throw TypeError(t+` requires finite stored float32.`);return e}function Pa(e){for(let t of[`Year`,`Day`,`Hour`,`Minute`,`Second`])N(e[t],t);Na(e.Factor,`Factor`)}var Fa={Year:`2002357e`,Day:`2000f9bb`,Hour:`2002b094`,Minute:`2002c5a2`,Second:`20032097`,Factor:`2002bfdf`},Ia=new WeakMap,La=class e{identity;values;owner;clock;base;consumers;kind=`gCClock_PS`;scratch={years:0,days:0,seconds:0};journals=[];blocked=null;processing=!1;calendarView;constructor(e,t,n,r,i={referenceWord:1},a={}){if(this.identity=e,this.values=t,this.owner=n,this.clock=r,this.base=i,this.consumers=a,!e)throw TypeError(`Actual Clock_PS identity is required.`);if(Ia.has(t))throw Error(`This physical Clock_PS value storage is already bound.`);Pa(t),N(i.referenceWord,`Clock_PS reference word`),this.calendarView={get year(){return t.Year},set year(e){t.Year=e},get day(){return t.Day},set day(e){t.Day=e},get hour(){return t.Hour},set hour(e){t.Hour=e},get minute(){return t.Minute},set minute(e){t.Minute=e},get second(){return t.Second},set second(e){t.Second=e}},r.bindPublishedCalendar(this.calendarView),Ia.set(t,this)}static fromPostInitializedConstructor(t,n,r,i,a={},o){let s=new ta(r,i),c=s.set({years:0,days:0,seconds:0});if(c.kind!==`applied`)throw Error(c.reason);return new e(t,{Year:0,Day:0,Hour:0,Minute:0,Second:0,Factor:12},n,s,o,a)}failure(){return this.blocked}getYear(){return N(this.values.Year,`Year`)}getDay(){return N(this.values.Day,`Day`)}getHour(){return N(this.values.Hour,`Hour`)}getMinute(){return N(this.values.Minute,`Minute`)}getSecond(){return N(this.values.Second,`Second`)}getFactor(){return Na(this.values.Factor,`Factor`)}isProcessable(){return!0}propertySetType(){return 32}emit(e,t=`read`){for(let n of this.journals)n.trace.push({...e}),t===`write`&&n.applied.push({...e}),t===`attempt`&&n.attempted.push({...e})}run(e){let t={trace:[],applied:[],attempted:[]};if(this.blocked)return{supported:!1,nativeReturnValue:null,reason:this.blocked,partial:!1,...t};this.journals.push(t);try{let n=e();if(this.blocked)throw Error(this.blocked);return{supported:!0,nativeReturnValue:n,...t}}catch(e){let n=e instanceof Error?e.message:String(e),r=t.applied.length>0||t.attempted.length>0;return r&&(this.blocked=n),{supported:!1,nativeReturnValue:null,reason:n,partial:r,...t}}finally{this.journals.pop()}}arithmetic(e,t,n){this.emit({operation:e,source:t},`attempt`);let r=n();if(r.kind!==`applied`)throw Error(e+`: `+r.reason);return this.emit({operation:e,source:t},`write`),r.value}host(e,t,n){this.emit({operation:e,source:t},`attempt`);let r=Ma(n(),e);if(this.blocked)throw Error(this.blocked);return this.emit({operation:e,source:t},`write`),r}ownerRead(e,t){let n=this.owner;n&&this.emit({operation:`owner.Modified read `+e,source:`Engine:3003544f`,property:t,value:n.modified()})}notifyInternal(e,t,n,r){if(e!==`enter`&&e!==`exit`||t!==null&&(typeof t!=`string`||t.includes(`\0`))||typeof n!=`boolean`)throw TypeError(`Original notification arguments required.`);if(r&&(this.ownerRead(e,t),this.emit({operation:`virtual OnNotify `+e,source:e===`enter`?`Engine:3003b5bb`:`Engine:3001a091`,property:t})),e===`exit`&&!n){let e=Xi({year:0,day:0,hour:N(this.values.Hour,`Hour`),minute:N(this.values.Minute,`Minute`),second:N(this.values.Second,`Second`)},this.clock.precisionBits).seconds;this.scratch.seconds=e,this.emit({operation:`scratch.seconds write`,source:`Game:20007090`,property:t,value:e},`write`),this.scratch.days=N(this.values.Day,`Day`),this.emit({operation:`scratch.days write`,source:`Game:20007090`,property:t,value:this.scratch.days},`write`),this.scratch.years=N(this.values.Year,`Year`),this.emit({operation:`scratch.years write`,source:`Game:20007090`,property:t,value:this.scratch.years},`write`),this.arithmetic(`bCClock.Set`,`SharedBase:1000849a`,()=>this.clock.set(this.scratch)),this.arithmetic(`bCClock.Adjust`,`SharedBase:100040ca`,()=>this.clock.adjust({factor:Na(this.values.Factor,`Factor`),secondsPerDay:86400,daysPerYear:365}))}return this.ownerRead(e,t),this.emit({operation:`SharedBase OnNotify return`,source:e===`enter`?`SharedBase:10008805`:`SharedBase:100027de`,property:t,value:!0}),!0}notify(e,t,n=!1){return this.run(()=>this.notifyInternal(e,t,n,!0))}onNotify(e,t,n=!1){return this.run(()=>this.notifyInternal(e,t,n,!1))}read(e){return this.run(()=>{if(!Number.isInteger(e)||e<0||e>65535)throw TypeError(`Clock Read version is uint16.`);return this.emit({operation:`Clock.Read u16 consumed`,source:`Game:20023e7a`,value:e}),this.notifyInternal(`exit`,null,!1,!1),1})}setter(e,t){return this.run(()=>(e===`Factor`?Na(t,`Factor`):N(t,e),this.notifyInternal(`enter`,e,!1,!0),this.values[e]=t,this.emit({operation:`property write`,source:`Game:`+Fa[e],property:e,value:t},`write`),this.notifyInternal(`exit`,e,!1,!0),null))}setYear(e){return this.setter(`Year`,e)}setDay(e){return this.setter(`Day`,e)}setHour(e){return this.setter(`Hour`,e)}setMinute(e){return this.setter(`Minute`,e)}setSecond(e){return this.setter(`Second`,e)}setFactor(e){return this.setter(`Factor`,e)}pause(){return this.run(()=>(this.arithmetic(`bCClock.Pause`,`SharedBase:10001b40`,()=>this.clock.pause()),null))}resume(){return this.run(()=>(this.arithmetic(`bCClock.Resume`,`SharedBase:100057f9`,()=>this.clock.resume()),null))}isPaused(){return this.clock.isPaused()}isValid(){return!!(N(this.base.referenceWord,`Clock_PS reference word`)&2147483648)}create(){return this.run(()=>(this.isValid()||(this.arithmetic(`bCClock.Pause`,`SharedBase:10001b40`,()=>this.clock.pause()),this.base.referenceWord=(this.base.referenceWord|2147483648)>>>0,this.emit({operation:`base.Create reference highbit`,source:`Engine:3003b863`,value:this.base.referenceWord},`write`)),1))}postInitializeProperties(){return this.run(()=>{for(let[e,t]of[[`Year`,0],[`Day`,0],[`Hour`,0],[`Minute`,0],[`Second`,0],[`Factor`,12]])this.values[e]=t,this.emit({operation:`PostInitialize property write`,source:`Game:200187fa`,property:e,value:t},`write`);return this.emit({operation:`base.PostInitialize return`,source:`SharedBase:100076f8`,value:1}),1})}invalidate(){return this.run(()=>{for(let e of[`seconds`,`days`,`years`])this.scratch[e]=0,this.emit({operation:`Invalidate scratch write`,source:`Game:20026049`,property:e,value:0},`write`);return this.arithmetic(`bCClock.Set`,`SharedBase:1000849a`,()=>this.clock.set(this.scratch)),null})}preProcess(){return this.run(()=>null)}process(){return this.run(()=>{if(this.processing)throw this.blocked=`Reentrant Clock_PS.OnProcess is outside this profile.`,Error(this.blocked);this.processing=!0;try{this.emit({operation:`base.OnProcess empty`,source:`Engine:3002a25c`});let e=this.arithmetic(`bCClock.GetTimeAndDate`,`SharedBase:10008670`,()=>this.clock.getTimeAndDate());Object.assign(this.scratch,e),this.emit({operation:`scratch time/date copy`,source:`Game:20025a13`},`write`);let t=Zi(e),n=Qi(N(this.values.Hour,`old Hour`)),r=Qi(t.hour);for(let[e,n]of[[`Year`,t.year],[`Day`,t.day],[`Hour`,t.hour],[`Minute`,t.minute],[`Second`,t.second]])this.values[e]=n,this.emit({operation:`process property publication`,source:`Game:20025a13`,property:e,value:n},`write`);let i=$i(e,this.clock.precisionBits),a=this.host(`GetWeatherAdmin`,`Game:2000d8af`,()=>this.consumers.weatherAdmin?.());if(a!==null&&this.host(`Weather.SetCurrentDayTime`,`Engine:3004070f`,()=>this.consumers.weatherCurrentDayTime?.(a,i)),n!==r){let e=this.host(`GetAmbientModule`,`Game:20017b4d`,()=>this.consumers.ambientModule?.()),t=this.host(`GetMusicModule`,`Game:2002f8a1`,()=>this.consumers.musicModule?.());t!==null&&this.host(`Music.SetDayTime`,`Game:200268dc`,()=>this.consumers.musicDayTime?.(t,{tableIndex:r,address:(544986232+r*4).toString(16)})),e!==null&&this.host(`Ambient.SetDayTime`,`Game:20022b15`,()=>this.consumers.ambientDayTime?.(e,r))}return null}finally{this.processing=!1}})}sessionAdapter(){let e=e=>e.supported?ja(void 0):{known:!1,reason:e.reason};return{setHour:t=>e(this.setHour(t)),setFactor:t=>e(this.setFactor(t)),pause:()=>e(this.pause()),resume:()=>e(this.resume())}}},Ra=JSON.parse(ka);if(Ra.schema!==`gothic3-clock-properties-manifest-v1`||Ra.seed.path!==`serialized-clock.json`)throw Error(`Original Clock_PS seed receipt differs.`);var za=JSON.parse(oa);if(za.schema!==`gothic3-entity-reflection-rules-v1`||za.clockVersion!==1||za.clockPropertyType!==32||za.clockWrapperVtable!==`20685bc4`||za.clockFields.map(e=>e.name).join(`,`)!==`Year,Day,Hour,Minute,Second,Factor`||za.clockFields.map(e=>e.nativeOffset).join(`,`)!==`20,24,28,32,36,40`||za.inheritedEntityPropertyTableEmpty!==!0||za.inputs.Game!==`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`||za.inputs.Engine!==`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`||za.inputs.SharedBase!==`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`)throw Error(`Original reflection receipt differs.`);var Ba=e=>({known:!0,value:e}),Va=e=>({known:!1,reason:e});function P(e,t){if(!e.known)throw Error(t+`: `+e.reason);return e.value}function Ha(e){if(!Number.isInteger(e)||e<0||e>4294967295)throw TypeError(`Original uint32 required.`);return e}function Ua(e){if(!/^[\x20-\x7e]*$/.test(e))throw Error(`Only audited ASCII original class/property names are supported.`);return e}var Wa=class{identity;factory;controller;embeddedIn;flags={value:10,knownMask:134217727};native=null;clockProperties=null;deleted=!1;constructor(e,t,n,r=null){if(this.identity=e,this.factory=t,this.controller=n,this.embeddedIn=r,!e)throw TypeError(`Actual reflection allocation identity required.`)}getReferenceCount(){return this.deleted?Va(`Deleted native wrapper`):Ba(Ha(this.flags.value)>>>3&16777215)}addReference(){return this.controller.value(()=>{if(this.deleted)throw Error(`Deleted native wrapper`);let e=Ha(this.flags.value);return this.flags.value=(((e&4294967288)+8^e)&134217720^e)>>>0,this.controller.write(`wrapper.AddReference`,`SharedBase:10004b74`),this.flags.value>>>3&16777215})}releaseReference(){return this.controller.value(()=>{if(this.deleted)throw Error(`Deleted native wrapper`);let e=Ha(this.flags.value);return(e>>>3&16777215)>1?(this.flags.value=(((e>>>3)*8-8^e)&134217720^e)>>>0,this.controller.write(`wrapper.ReleaseReference decrement`,`SharedBase:10006636`),this.flags.value>>>3&16777215):(this.flags.value=(e&4160749575)>>>0,this.controller.write(`wrapper.ReleaseReference clear count`,`SharedBase:10006636`),this.controller.effect(`captured deleting destructor(arg0)`,`SharedBase:10006636`,()=>this.controller.clockHost.deletingDestructor?.(this,0)),this.controller.effect(`MemoryAdmin.DeleteObject`,`SharedBase:10006636`,()=>this.controller.clockHost.deleteObject?.(this)),this.deleted=!0,this.controller.write(`wrapper deleted capability`,`SharedBase:10006636`),0)})}read(e){return this.controller.value(()=>P(this.factory.read(this,e),`actual factory wrapper Read`))}},Ga=class{controller;root=null;instance=null;destroyed=!1;constructor(e){this.controller=e}setInstance(e){if(this.destroyed)throw Error(`Destroyed accessor`);e&&P(e.addReference(),`incoming wrapper AddReference`);let t=this.instance;t&&(P(t.releaseReference(),`old wrapper ReleaseReference`),this.instance=null,this.controller.write(`accessor old instance clear`,`SharedBase:10002455`)),e&&this.root===null&&(this.root=e.factory.root),this.instance=e,this.controller.write(`accessor instance assignment`,`SharedBase:10002455`)}isValidByte(){return this.destroyed?Va(`Destroyed accessor`):Ba(Number(this.root!==null))}nativeObject(){return this.destroyed?Va(`Destroyed accessor`):Ba(this.instance?.native??null)}className(){return this.destroyed||!this.root?Va(`SharedBase:1000156e obsolete/null root branch is unresolved`):Ba(this.root.className)}destroy(){return this.controller.value(()=>{if(this.destroyed)throw Error(`Accessor destructor already ran`);let e=this.instance;e&&(P(e.releaseReference(),`accessor destructor ReleaseReference`),this.instance=null,this.controller.write(`accessor destructor conditional clear`,`SharedBase:100025d6`)),this.instance=null,this.controller.write(`accessor destructor final clear`,`SharedBase:100025d6`),this.destroyed=!0})}},Ka=class{wrapper;accessor;index=0;constructor(e,t){this.wrapper=e;let n=e.controller;if(t){this.accessor=t;return}let r=new Ga(n);r.setInstance(e),this.accessor=new Ga(n),this.accessor.setInstance(r.instance),this.accessor.root=r.root,P(r.destroy(),`property iterator temporary destruction`)}field(){return this.accessor.root?.fields[this.index]??null}advance(){this.index=this.index+1>>>0,this.wrapper.controller.write(`property iterator increment`,`SharedBase:100043fe`);let e=this.accessor.root;if(!e)throw Error(`Native iterator null-root dereference is outside the selected profile.`);if(this.index>=e.fields.length){this.index=0;let t=this.accessor.instance;t&&P(t.addReference(),`iterator saved instance reference`);let n=this.wrapper.controller.resolveRoot(e.baseClassName);this.accessor.setInstance(null),this.accessor.root=n,this.wrapper.controller.write(`iterator base root assignment`,`SharedBase:10006861`),n&&this.accessor.setInstance(t),t&&P(t.releaseReference(),`iterator saved reference release`)}}destroy(){P(this.accessor.destroy(),`property iterator destruction`)}},qa=class{identity;clockHost;factories=new Map;roots=new Map;trace=[];applied=[];attempted=[];heap=[];blocked=null;allocation=0;constructor(e,t){if(this.identity=e,this.clockHost=t,!e)throw TypeError(`Reflection controller identity required.`);let n=Object.freeze({className:`eCEntityPropertySet`,baseClassName:`bCObjectRefBase`,fields:Object.freeze([])});this.roots.set(n.className,n);let r={root:Object.freeze({className:`gCClock_PS`,baseClassName:`eCEntityPropertySet`,fields:Object.freeze(za.clockFields.map(e=>Object.freeze({...e})))}),cloneRoot:e=>e.value(()=>e.constructClock(r)),read:(e,t)=>this.value(()=>this.readClockWrapper(e,t)),getVersion:e=>e.native?.className===`gCClock_PS`&&e.clockProperties?.base===e.native?Ba(1):Va(`Actual concrete Clock PS required`)};P(this.registerFactory(r),`Clock factory registration`)}receipt(){return{trace:this.trace.slice(),applied:this.applied.slice(),attempted:this.attempted.slice(),partial:this.blocked!==null&&(this.applied.length>0||this.attempted.length>0),required:this.blocked,worldResident:!1}}allocations(){return this.heap.slice()}value(e){if(this.blocked)return Va(this.blocked);try{let t=e();if(this.blocked)throw Error(this.blocked);return Ba(t)}catch(e){return this.blocked=e instanceof Error?e.message:String(e),Va(this.blocked)}}write(e,t){this.trace.push({operation:e,source:t}),this.applied.push(e)}read(e,t,n,r){this.trace.push({operation:e,source:t,cursor:n.cursor(),value:r})}effect(e,t,n){this.attempted.push(e),this.trace.push({operation:e,source:t});let r=n();if(!r)throw Error(e+`: original native boundary is unresolved`);let i=P(r,e);if(this.blocked)throw Error(this.blocked);return this.applied.push(e),i}clockResult(e,t){return this.effect(e,`Game:gCClock_PS`,()=>{let e=t();return e.supported?Ba(e.nativeReturnValue):Va(e.reason)})}registerFactory(e){return this.value(()=>{let t=Ua(e.root.className);if(!t)throw Error(`An original nonempty class name is required.`);if(this.factories.has(t)||this.roots.has(t))throw Error(`Duplicate native root replacement/fatal branch is unresolved.`);this.factories.set(t,e),this.roots.set(t,e.root),this.write(`registered concrete class factory `+t,`SharedBase:1000191f`)})}registerRoot(e){return this.value(()=>{let t=Ua(e.className);if(!t||this.roots.has(t))throw Error(`Duplicate/empty native metadata root unresolved`);e.baseClassName!==null&&Ua(e.baseClassName),this.roots.set(t,e),this.write(`registered inherited metadata root `+t,`SharedBase:1000191f`)})}resolveRoot(e){if(e===null)return null;let t=this.roots.get(Ua(e));if(!t)throw Error(`SharedBase:100085e9 actual inherited root lookup unresolved for `+e);return t}allocateWrapper(e,t){if(this.factories.get(e.root.className)!==e)throw Error(`Actual registered factory capability required`);let n=new Wa(this.identity+`:wrapper:`+ ++this.allocation,e,this);return this.heap.push({wrapper:n,nativeObject:null,propertySet:null,lowerClock:null,phase:`wrapper`,initializedFields:new Set,worldResident:!1}),this.write(`wrapper successful allocation/base constructor/nonroot flag/type`,t),n}allocateEmbeddedWrapper(e,t,n,r){if(this.blocked)throw Error(this.blocked);if(this.factories.get(e.root.className)!==e)throw Error(`Actual registered embedded factory capability required`);if(this.allocationFor(n).nativeObject===null||!Number.isInteger(r)||r<0||r>4294967295)throw Error(`Actual parent native storage and original embedded offset required`);if(this.heap.some(e=>e.wrapper.embeddedIn?.parent===n&&e.wrapper.embeddedIn.nativeOffset===r))throw Error(`Original embedded wrapper slot already constructed`);let i=Object.freeze({parent:n,nativeOffset:r}),a=new Wa(n.identity+`:embedded:`+r,e,this,i);return this.heap.push({wrapper:a,nativeObject:null,propertySet:null,lowerClock:null,phase:`wrapper`,initializedFields:new Set,worldResident:!1}),this.write(`embedded wrapper base constructor with masked flags`,`SharedBase:10089290`),a.flags.value=(a.flags.value|4)>>>0,this.write(`embedded wrapper concrete type and bit2 store`,t),a}allocationFor(e){let t=this.heap.find(t=>t.wrapper===e);if(!t||e.controller!==this||e.deleted)throw Error(`Actual retained live wrapper required`);return t}retainNative(e,t,n=`native-constructor`){if(!(t instanceof wa))throw Error(`Actual entity property set required`);this.retainObject(e,t,n)}retainObject(e,t,n=`native-constructor`){let r=this.allocationFor(e);if(r.nativeObject!==null||!t.identity||t.className!==e.factory.root.className||!t.values||typeof t.values!=`object`)throw Error(`Fresh concrete native allocation required`);if(t instanceof wa?e.factory.nativeCategory===`non-property-set`:e.factory.nativeCategory!==`non-property-set`)throw Error(`Source-backed native factory category required`);Ha(t.referenceWord),r.nativeObject=t,r.propertySet=t instanceof wa?t:null,r.phase=n}setAllocationPhase(e,t){this.allocationFor(e).phase=t}attachConstructedNative(e,t,n,r){let i=this.allocationFor(e);if(i.nativeObject!==t||e.native!==null||t.wrapper!==null||(t.referenceWord&2147483647)!=1)throw Error(`Fresh source attach profile requires native count1 and NULL wrapper`);t.referenceWord=(t.referenceWord&2147483648|2)>>>0,this.write(`native AddVirtualReference before attach`,`SharedBase:10004ea3`),t.wrapper=e,e.native=t,this.write(`SetPropertyObject and wrapper native assignment`,n);let a=t.wrapper;t.wrapper=null,this.write(`native temporary wrapper clear`,r),t.referenceWord=(t.referenceWord&2147483648|1)>>>0,this.write(`native initial ReleaseVirtualReference`,`SharedBase:1000235b`),t.wrapper=a,this.write(`native original wrapper restore`,r),i.phase=`attached`}initializeProperties(e,t,n,r){let i=this.allocationFor(e);if(e.native!==i.nativeObject||i.phase!==`attached`)throw Error(`Actual attached native object required`);this.trace.push({operation:`factory RegisterPropertyObject nonroot return`,source:`SharedBase:10006db6`,value:!0}),P(e.addReference(),`default creator construction`);let a=new Ka(e);for(let e=a.field();e!==null;e=a.field())this.effect(`descriptor default `+e.name,e.defaultInitializer??e.reader,()=>t(e)),i.initializedFields.add(e.name),a.advance();if(e.native!==null){if(e.native!==i.nativeObject)throw Error(`Replaced native PostInitialize receiver unresolved`);this.effect(`PostInitializeProperties`,r,n)}i.phase=`initialized`,a.destroy(),this.effect(`creator ErrorAdmin.IsInPanicState`,`SharedBase:10007356`,()=>this.clockHost.isInPanicState())||P(e.releaseReference(),`default creator destructor`)}readWrapperProperties(e,t,n){let r=this.allocationFor(e);if(e.native===null||e.native!==r.nativeObject||r.phase!==`initialized`)throw Error(`Actual initialized concrete wrapper required`);let i=t.u16();this.read(`wrapper object version`,`SharedBase:10003ed6`,t,i),this.read(`wrapper declared size; normal branch does not seek`,n.wrapperSource,t,t.u32()),i===1&&this.read(`legacy object name`,`SharedBase:10002f68`,t,t.string()),i<=81&&this.read(`legacy property ID20`,`SharedBase:10002f68`,t,t.propertyID());let a=t.u16();if(this.read(`property table version`,n.dataSource,t,a),a===0)throw Error(n.dataSource+` CallFatalError property version0 boundary`);P(e.addReference(),`read creator construction`);let o=new Ka(e),s=t.u32()|0;this.read(`signed property count`,n.dataSource,t,s);let c=!0;for(let r=0;r<s;r++){let r=Ua(t.string()),i=a>29?Ua(t.string()):null,s=null;if(c&&(s=o.field(),(s?.name??``)!==r&&(c=!1),o.advance()),!c){let t=new Ka(e),n=new Ga(this);n.setInstance(t.accessor.instance),n.root=t.accessor.root;let i=new Ka(e,n);for(;i.field()?.name!==r&&n.root!==null&&n.root.baseClassName!==null;)i.advance();s=i.field(),s&&(t.accessor.setInstance(n.instance),t.accessor.root=n.root,t.index=i.index),P(n.destroy(),`named property resolve temporary destruction`),t.destroy()}if(!s||i!==null&&i!==s.typeName){if(!n.readObsoleteProperty)throw Error(n.dataSource+` obsolete property/critical-section reader unresolved for `+r+` (stream type `+(i??`<absent>`)+`, registered type `+(s?.typeName??`<missing>`)+`)`);this.effect(`obsolete property fallback `+r,n.dataSource,()=>n.readObsoleteProperty(r,i,s,t))}else this.effect(`descriptor reader `+r,s.reader,()=>n.readField(s,t))}return this.effect(`native derived Read`,n.dataSource,()=>n.readNative(t)),o.destroy(),this.effect(`read creator ErrorAdmin.IsInPanicState`,`SharedBase:10007356`,()=>this.clockHost.isInPanicState())||P(e.releaseReference(),`read creator destructor`),r.phase=`read`,i}constructClock(e){let t=new Wa(this.identity+`:wrapper:`+ ++this.allocation,e,this),n={wrapper:t,nativeObject:null,propertySet:null,lowerClock:null,phase:`wrapper`,initializedFields:new Set,worldResident:!1};this.heap.push(n),this.write(`wrapper successful allocation/base constructor/nonroot flag/type`,`Game:2020b0e0`);let r={},i=null,a=null,o=e=>e===c&&t.native===c?Ba(void 0):Va(`Actual live Clock_PS callback receiver required`),s={added:o,removed:o,postRead:o},c=new wa(t.identity+`:native`,`gCClock_PS`,32,r,{read:()=>i,write:e=>{i=e,a&&(a.owner=e?.propertyOwner??null)}},null,s,()=>Ba(!0)),l=new ta(this.clockHost.timestamps,this.clockHost.precision);n.nativeObject=c,n.propertySet=c,n.lowerClock=l,n.phase=`native-constructor`,this.write(`native Clock allocation/base constructor/scratch zero`,`Game:20208160`),this.effect(`native constructor bCClock.Set zero date`,`Game:20208160`,()=>{let e=l.set({years:0,days:0,seconds:0});return e.kind===`applied`?Ba(void 0):Va(e.reason)}),this.effect(`native Clock.Create Pause`,`Game:20007130`,()=>{let e=l.pause();return e.kind===`applied`?Ba(void 0):Va(e.reason)}),c.createBase(),this.write(`native base.Create valid high bit`,`Engine:3003b863`),n.phase=`created`,c.referenceWord=(c.referenceWord&2147483648|2)>>>0,this.write(`native AddVirtualReference before attach`,`SharedBase:10004ea3`),c.wrapper=t,t.native=c,this.write(`SetPropertyObject and wrapper native assignment`,`Game:20208560`);let u=c.wrapper;c.wrapper=null,this.write(`native temporary wrapper clear`,`Game:20208970`),c.referenceWord=(c.referenceWord&2147483648|1)>>>0,this.write(`native initial ReleaseVirtualReference`,`SharedBase:1000235b`),c.wrapper=u,this.write(`native original wrapper restore`,`Game:20208970`),n.phase=`attached`,this.trace.push({operation:`factory RegisterPropertyObject nonroot return`,source:`SharedBase:10006db6`,value:!0}),P(t.addReference(),`default creator construction`);let d=new Ka(t);for(let e=d.field();e!==null;e=d.field())r[e.name]=0,this.write(`descriptor default zero `+e.name,e.name===`Factor`?`Game:2020ad40`:`Game:2020a4b0`),n.initializedFields.add(e.name),d.advance();return a=new La(c.identity,r,null,l,c,this.clockHost.consumers),t.clockProperties=a,this.clockResult(`PostInitializeProperties`,()=>a.postInitializeProperties()),n.phase=`initialized`,d.destroy(),this.effect(`creator ErrorAdmin.IsInPanicState`,`SharedBase:10007356`,()=>this.clockHost.isInPanicState())||P(t.releaseReference(),`default creator destructor`),t}readAccessor(e){return this.value(()=>{let t=new Ga(this),n=e.u16();this.read(`accessor version`,`SharedBase:100052f9`,e,n);let r=e.bool();if(this.read(`accessor present`,`SharedBase:100052f9`,e,r),!r)return t;let i=e.u16();this.read(`singleton version`,`SharedBase:1000437c`,e,i);let a=e.bool();if(this.read(`singleton present`,`SharedBase:1000437c`,e,a),!a)return t;let o=Ua(e.string());this.read(`class name`,`SharedBase:1000437c`,e,o);let s=this.factories.get(o);if(!s)throw Error(`SharedBase:10090c90 registered factory lookup unresolved for `+o+`; ReadSkipObject is not inferred`);this.read(`factory version`,`SharedBase:1000393b`,e,e.u16()),this.read(`factory bool`,`SharedBase:1000393b`,e,e.bool()),this.read(`factory trailing version`,`SharedBase:1000393b`,e,e.u16());let c=this.effect(`root Clone`,`SharedBase:1000393b`,()=>s.cloneRoot(this));return this.effect(`wrapper virtual Read`,`SharedBase:1000393b`,()=>c.read(e)),t.setInstance(c),P(c.releaseReference(),`factory initial reference balance`),t})}readClockWrapper(e,t){if(e.factory.root.className!==`gCClock_PS`||!e.clockProperties||!e.native)throw Error(`Actual constructed Clock wrapper required.`);let n=t.u16();this.read(`wrapper object version`,`SharedBase:10003ed6`,t,n),this.read(`wrapper declared size; normal branch does not seek`,`Game:202095d0`,t,t.u32()),n===1&&this.read(`legacy object name`,`SharedBase:10002f68`,t,t.string()),n<=81&&this.read(`legacy property ID20`,`SharedBase:10002f68`,t,t.propertyID());let r=t.u16();if(this.read(`property table version`,`Game:2020b3d0`,t,r),r===0)throw Error(`Game:2020b3d0 CallFatalError property version0 boundary`);P(e.addReference(),`read creator construction`);let i=new Ka(e),a=t.u32()|0;this.read(`signed property count`,`Game:2020b3d0`,t,a);let o=!0;for(let n=0;n<a;n++){let n=Ua(t.string()),a=r>29?Ua(t.string()):null,s=null;if(o&&(s=i.field(),(s?.name??``)!==n&&(o=!1),i.advance()),!o){let t=new Ka(e),r=new Ga(this);r.setInstance(t.accessor.instance),r.root=t.accessor.root;let i=new Ka(e,r);for(;i.field()?.name!==n&&r.root!==null&&r.root.baseClassName!==null;)i.advance();s=i.field(),s&&(t.accessor.setInstance(r.instance),t.accessor.root=r.root,t.index=i.index),P(r.destroy(),`named property resolve temporary destruction`),t.destroy()}if(!s||a!==null&&a!==s.typeName)throw Error(`Game:2020b530 obsolete property/critical-section reader unresolved for `+n);if(this.read(`property reader version`,`SharedBase:10005d35`,t,t.u16()),this.read(`property payload declared size; scalar reader consumes4`,s.reader,t,t.u32()),e.native!==null){let t=e.clockProperties;if(!t||t.base!==e.native||t.values!==e.native.values)throw Error(`Clock native notification capability unavailable or replaced`);this.clockResult(`propagated NotifyEnter `+n,()=>t.notify(`enter`,n,!0))}let c=e.native;if(!c||c.className!==`gCClock_PS`||!e.clockProperties||c.values!==e.clockProperties.values)throw Error(`Scalar destination GetNativeObject is unavailable or replaced`);let l=s.typeName===`float`?t.f32():t.u32();if(c.values[s.name]=l,this.write(`serialized scalar write `+n,s.reader),e.native!==null){let t=e.clockProperties;if(!t||t.base!==e.native||t.values!==e.native.values)throw Error(`Clock native exit capability unavailable or replaced`);this.clockResult(`propagated NotifyExit `+n,()=>t.notify(`exit`,n,!0))}}let s=e.clockProperties;if(!e.native||!s||s.base!==e.native||s.values!==e.native.values)throw Error(`Game:2020b3d0 null/replaced native recreation boundary unresolved`);let c=t.u16();this.read(`native derived Clock.Read version`,`Game:20023e7a`,t,c),this.clockResult(`derived Clock.Read calendar Set/Adjust`,()=>s.read(c)),i.destroy(),this.effect(`read creator ErrorAdmin.IsInPanicState`,`SharedBase:10007356`,()=>this.clockHost.isInPanicState())||P(e.releaseReference(),`read creator destructor`);let l=this.heap.find(t=>t.wrapper===e);return l&&(l.phase=`read`),n}castPropertySet(e){return e===null?Ba(null):e instanceof wa?Ba(e):this.heap.some(t=>t.nativeObject===e&&t.wrapper.factory.nativeCategory===`non-property-set`)?Ba(null):Va(`Original dynamic_cast source capability unresolved`)}propertySetVersion(e){return e.wrapper instanceof Wa&&e.wrapper.native===e&&e.wrapper.factory.root.className===e.className?e.wrapper.factory.getVersion(e.wrapper):Va(`Actual concrete PS virtual GetVersion unresolved`)}clock(e){let t=e.wrapper;return t instanceof Wa&&t.native===e&&t.clockProperties?Ba(t.clockProperties):Va(`Actual physical Clock capability required`)}},Ja=JSON.parse(sa),Ya=new WeakSet;async function Xa(){if(Ja.schema!==`gothic3-entity-reflection-manifest-v1`)throw Error(`Reflection manifest differs`);let e=Ja.outputs.find(e=>e.path===`serialized-candidates.json`);if(!e)throw Error(`Reflection serialized receipt missing`);let t=await _r(`entity-reflection/`+e.path,e);if(t.schema!==`gothic3-entity-reflection-serialized-v1`||t.phase!==`serialized-candidates`||t.worldResident!==!1||t.entities.map(e=>e.name).join(`,`)!==`World_MCP,PC_Hero`||t.entities[0].propertySets.length!==13||t.entities[1].propertySets.length!==19)throw Error(`Original serialized focus differs`);let n=e=>{e&&typeof e==`object`&&!Object.isFrozen(e)&&(Object.values(e).forEach(n),Object.freeze(e))};return n(t),Ya.add(t),t}function Za(e,t,n){if(!Ya.has(e))throw Error(`Use the hash-verified serialized reflection document`);if(!Number.isInteger(n)||n<0)throw TypeError(`Original property-set index required`);let r=e.entities.find(e=>e.name===t)?.propertySets[n];if(!r||!/^(?:[0-9a-f]{2})+$/.test(r.serializedRaw))throw Error(`Original serialized PS bytes missing`);let i=new Da(Uint8Array.from(r.serializedRaw.match(/../g),e=>parseInt(e,16)),e.strings);if(i.u16()!==r.outerVersion)throw Error(`Original outer PS version differs`);return{outerVersion:r.outerVersion,input:i,source:r}}var Qa=`{
  "schema": "gothic3-attribute-reading-rules-v1",
  "nativeCodeExecuted": false,
  "inputs": {
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214",
    "Engine": "d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3",
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f"
  },
  "classes": {
    "gCAttribute": {
      "baseClass": "bCObjectRefBase",
      "nativeBytes": 24,
      "allocationTag": 196,
      "nativeVtable": "2065da7c",
      "wrapperVtable": "206a2d94",
      "rootRegistrar": "Game:205263a0",
      "rootPointer": "20613eec",
      "rootObject": "207ccfb4",
      "typeInitialize": "Game:20398d50",
      "constructor": "Game:20397cd0",
      "constructorExport": "Game:20008387",
      "allocator": "Game:203980f0",
      "wrapperClone": "Game:2039a790",
      "initialize": "Game:20398b00",
      "attach": "Game:20397e60",
      "wrapperRead": "Game:20398c90",
      "dataRead": "Game:2039aa80",
      "postInitialize": "Game:20397ca0",
      "rootPointerProof": {
        "address": "20613eec",
        "bytes": "a0635220"
      },
      "fields": [
        {
          "className": "gCAttribute",
          "name": "Tag",
          "nativeOffset": 12,
          "typeName": "bCString",
          "registrar": "Game:20526400",
          "reader": "Game:20399d80",
          "defaultInitializer": "Game:20399b20",
          "addressGetter": "Game:20399900",
          "descriptor": "207ccfc4",
          "vtable": "206a2e74",
          "descriptorStore": {
            "address": "20526450",
            "bytes": "c705c4cf7c20742e6a20",
            "assembly": "MOV dword ptr [0x207ccfc4],0x206a2e74"
          },
          "offsetStore": {
            "address": "20526469",
            "bytes": "c705e4cf7c200c000000",
            "assembly": "MOV dword ptr [0x207ccfe4],0xc"
          },
          "defaultStore": {
            "address": "20526473",
            "bytes": "8935e8cf7c20",
            "assembly": "MOV dword ptr [0x207ccfe8],ESI"
          },
          "nameLiteral": {
            "address": "2065da5c",
            "bytes": "54616700",
            "instruction": {
              "address": "20526420",
              "bytes": "685cda6520",
              "assembly": "PUSH 0x2065da5c"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065da5c",
              "bytes": "54616700",
              "instruction": {
                "address": "20526420",
                "bytes": "685cda6520",
                "assembly": "PUSH 0x2065da5c"
              }
            }
          ]
        },
        {
          "className": "gCAttribute",
          "name": "Modifier",
          "nativeOffset": 16,
          "typeName": "int",
          "registrar": "Game:205264f0",
          "reader": "Game:2039a610",
          "defaultInitializer": "Game:2039a3c0",
          "addressGetter": "Game:2039a1a0",
          "descriptor": "207ccfec",
          "vtable": "206a2efc",
          "descriptorStore": {
            "address": "20526539",
            "bytes": "c705eccf7c20fc2e6a20",
            "assembly": "MOV dword ptr [0x207ccfec],0x206a2efc"
          },
          "offsetStore": {
            "address": "20526552",
            "bytes": "c70508d07c2010000000",
            "assembly": "MOV dword ptr [0x207cd008],0x10"
          },
          "defaultStore": {
            "address": "2052655c",
            "bytes": "c7050cd07c2000000000",
            "assembly": "MOV dword ptr [0x207cd00c],0x0"
          },
          "nameLiteral": {
            "address": "2065da60",
            "bytes": "4d6f64696669657200",
            "instruction": {
              "address": "20526510",
              "bytes": "6860da6520",
              "assembly": "PUSH 0x2065da60"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065da60",
              "bytes": "4d6f64696669657200",
              "instruction": {
                "address": "20526510",
                "bytes": "6860da6520",
                "assembly": "PUSH 0x2065da60"
              }
            }
          ]
        },
        {
          "className": "gCAttribute",
          "name": "Value",
          "nativeOffset": 20,
          "typeName": "int",
          "registrar": "Game:205265e0",
          "reader": "Game:2039a610",
          "defaultInitializer": "Game:2039a3c0",
          "addressGetter": "Game:2039a1a0",
          "descriptor": "207cd010",
          "vtable": "206a2efc",
          "descriptorStore": {
            "address": "20526629",
            "bytes": "c70510d07c20fc2e6a20",
            "assembly": "MOV dword ptr [0x207cd010],0x206a2efc"
          },
          "offsetStore": {
            "address": "20526642",
            "bytes": "c7052cd07c2014000000",
            "assembly": "MOV dword ptr [0x207cd02c],0x14"
          },
          "defaultStore": {
            "address": "2052664c",
            "bytes": "c70530d07c2000000000",
            "assembly": "MOV dword ptr [0x207cd030],0x0"
          },
          "nameLiteral": {
            "address": "20662288",
            "bytes": "56616c756500",
            "instruction": {
              "address": "205265f5",
              "bytes": "6888226620",
              "assembly": "PUSH 0x20662288"
            }
          },
          "nameLiteralUses": [
            {
              "address": "20662288",
              "bytes": "56616c756500",
              "instruction": {
                "address": "205265f5",
                "bytes": "6888226620",
                "assembly": "PUSH 0x20662288"
              }
            },
            {
              "address": "20662288",
              "bytes": "56616c756500",
              "instruction": {
                "address": "20526600",
                "bytes": "6888226620",
                "assembly": "PUSH 0x20662288"
              }
            }
          ]
        }
      ],
      "nativeApplyDefaults": "Game:20397a00",
      "wrapperBytes": 16,
      "wrapperAllocationTag": 400,
      "baseClassName": null
    },
    "gCStat": {
      "baseClass": "gCAttribute",
      "nativeBytes": 32,
      "allocationTag": 196,
      "nativeVtable": "2065db4c",
      "wrapperVtable": "206a3164",
      "rootRegistrar": "Game:20526910",
      "rootPointer": "206141d0",
      "rootObject": "207cd0e4",
      "typeInitialize": "Game:2039c2d0",
      "constructor": "Game:2039b270",
      "allocator": "Game:2039b680",
      "wrapperClone": "Game:2039d460",
      "initialize": "Game:2039c070",
      "attach": "Game:2039b400",
      "wrapperRead": "Game:2039c210",
      "dataRead": "Game:2039d680",
      "postInitialize": "Game:20397ca0",
      "rootPointerProof": {
        "address": "206141d0",
        "bytes": "10695220"
      },
      "fields": [
        {
          "className": "gCStat",
          "name": "BaseMaximum",
          "nativeOffset": 24,
          "typeName": "int",
          "registrar": "Game:20526970",
          "reader": "Game:2039d2e0",
          "defaultInitializer": "Game:2039d090",
          "addressGetter": "Game:2039ce70",
          "descriptor": "207cd0f4",
          "vtable": "206a3244",
          "descriptorStore": {
            "address": "205269b9",
            "bytes": "c705f4d07c2044326a20",
            "assembly": "MOV dword ptr [0x207cd0f4],0x206a3244"
          },
          "offsetStore": {
            "address": "205269d2",
            "bytes": "c70510d17c2018000000",
            "assembly": "MOV dword ptr [0x207cd110],0x18"
          },
          "defaultStore": {
            "address": "205269dc",
            "bytes": "c70514d17c2000000000",
            "assembly": "MOV dword ptr [0x207cd114],0x0"
          },
          "nameLiteral": {
            "address": "2065db20",
            "bytes": "426173654d6178696d756d00",
            "instruction": {
              "address": "20526990",
              "bytes": "6820db6520",
              "assembly": "PUSH 0x2065db20"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065db20",
              "bytes": "426173654d6178696d756d00",
              "instruction": {
                "address": "20526990",
                "bytes": "6820db6520",
                "assembly": "PUSH 0x2065db20"
              }
            }
          ]
        },
        {
          "className": "gCStat",
          "name": "MaximumModifier",
          "nativeOffset": 28,
          "typeName": "int",
          "registrar": "Game:20526a60",
          "reader": "Game:2039d2e0",
          "defaultInitializer": "Game:2039d090",
          "addressGetter": "Game:2039ce70",
          "descriptor": "207cd118",
          "vtable": "206a3244",
          "descriptorStore": {
            "address": "20526aa9",
            "bytes": "c70518d17c2044326a20",
            "assembly": "MOV dword ptr [0x207cd118],0x206a3244"
          },
          "offsetStore": {
            "address": "20526ac2",
            "bytes": "c70534d17c201c000000",
            "assembly": "MOV dword ptr [0x207cd134],0x1c"
          },
          "defaultStore": {
            "address": "20526acc",
            "bytes": "c70538d17c2000000000",
            "assembly": "MOV dword ptr [0x207cd138],0x0"
          },
          "nameLiteral": {
            "address": "2065db30",
            "bytes": "4d6178696d756d4d6f64696669657200",
            "instruction": {
              "address": "20526a80",
              "bytes": "6830db6520",
              "assembly": "PUSH 0x2065db30"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065db30",
              "bytes": "4d6178696d756d4d6f64696669657200",
              "instruction": {
                "address": "20526a80",
                "bytes": "6830db6520",
                "assembly": "PUSH 0x2065db30"
              }
            }
          ]
        }
      ],
      "nativeApplyDefaults": "Game:2039aea0",
      "wrapperBytes": 16,
      "wrapperAllocationTag": 400,
      "baseClassName": "gCAttribute"
    }
  },
  "reflectionBaseRootRelation": {
    "accessorGetBase": "SharedBase:10006f41",
    "implementation": "SharedBase:1009ae00",
    "sentinelName": "SharedBase:10005e5c",
    "compareSource": "SharedBase:10002eb9",
    "rootLookup": "SharedBase:100085e9",
    "gCAttribute": {
      "wrapperBaseNameSlot": 8,
      "target": "Game:200043b3",
      "returnedName": "bCObjectRefBase",
      "result": null,
      "nullBranchInstruction": "1009ae55"
    },
    "gCStat": {
      "wrapperBaseNameSlot": 8,
      "target": "Game:2000b3d9",
      "returnedName": "gCAttribute",
      "result": "actual gCAttribute registered root"
    }
  },
  "statBootstrapOriginalPEOnly": {
    "module": "Game",
    "entry": "20526910",
    "endVAInclusive": "2052695a",
    "bytes": 75,
    "raw": "b9e4d07c20ff15b8877d20c705ecd07c2000000000c705e4d07c2064316a20e87dcdadff6a01b9e4d07c20a3f0d07c20c705ecd07c2000000000e8926faeff6830305620e875cef3ff59c3",
    "sha256": "d2ac58943f13166d44cc6b699a067e12e2882460c357d74ba622feb061ad1d8b",
    "proofKind": "original-PE-only; absent functions.csv and full_disassembly.asm",
    "catalogBody": false,
    "decompiledBody": false,
    "sourceBodyInvented": false,
    "rootObject": "207cd0e4",
    "wrapperVtable": "206a3164",
    "typeStore": "207cd0f0",
    "typeCallExport": "Game:200036b1",
    "typeCallImplementation": "Game:2039c2d0",
    "initializeExport": "Game:2000d8e1",
    "initializeImplementation": "Game:2039c070",
    "initializeArgument": true,
    "atexitCallback": "Game:20563030",
    "byteSlices": [
      {
        "address": "20526910",
        "bytes": "b9e4d07c20",
        "meaning": "root receiver"
      },
      {
        "address": "20526915",
        "bytes": "ff15b8877d20",
        "meaning": "imported base constructor"
      },
      {
        "address": "2052691b",
        "bytes": "c705ecd07c2000000000",
        "meaning": "native pointer clear"
      },
      {
        "address": "20526925",
        "bytes": "c705e4d07c2064316a20",
        "meaning": "wrapper vtable store"
      },
      {
        "address": "2052692f",
        "bytes": "e87dcdadff",
        "meaning": "type initializer call"
      },
      {
        "address": "20526934",
        "bytes": "6a01",
        "meaning": "true initialization argument"
      },
      {
        "address": "20526936",
        "bytes": "b9e4d07c20",
        "meaning": "root receiver"
      },
      {
        "address": "2052693b",
        "bytes": "a3f0d07c20",
        "meaning": "type pointer store"
      },
      {
        "address": "20526940",
        "bytes": "c705ecd07c2000000000",
        "meaning": "native pointer clear"
      },
      {
        "address": "2052694a",
        "bytes": "e8926faeff",
        "meaning": "root initialize call"
      },
      {
        "address": "2052694f",
        "bytes": "6830305620",
        "meaning": "atexit callback argument"
      },
      {
        "address": "20526954",
        "bytes": "e875cef3ff",
        "meaning": "atexit call"
      },
      {
        "address": "20526959",
        "bytes": "59",
        "meaning": "stack adjustment"
      },
      {
        "address": "2052695a",
        "bytes": "c3",
        "meaning": "return"
      }
    ]
  },
  "profile": {
    "worldResident": false,
    "detached": true,
    "frontendRequiredServices": [
      "actual allocation/reference handoff",
      "actual CString ownership and read",
      "captured accessor/descriptor enter and exit",
      "source terminal native/wrapper lifetime"
    ],
    "freshSuccessfulAllocation": true,
    "numericNativePointersMasked": true,
    "inheritedFields": "gCStat owns BaseMaximum and MaximumModifier and inherits gCAttribute Tag, Modifier, Value; actual accessor stops at bCObjectRefBase sentinel",
    "defaults": "Tag actual CString clear; signed integer descriptor defaults 0xffffffff",
    "nativeCodeExecuted": false
  }
}
`,$a=JSON.parse(`{
  "schema": "gothic3-player-properties-manifest-v1",
  "inputs": {
    "Game": {
      "path": "00_Original_Runtime/Game.dll",
      "sha256": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f"
    },
    "Script": {
      "path": "00_Original_Runtime/Script.dll",
      "sha256": "9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08"
    },
    "Script_Game": {
      "path": "00_Original_Runtime/scripts/Script_Game.dll",
      "sha256": "2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1"
    },
    "SharedBase": {
      "path": "00_Original_Runtime/SharedBase.dll",
      "sha256": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214"
    }
  },
  "allListedInstructionBytesMatchOriginalPE": true,
  "hero": {
    "path": "public/gothic3/player-properties/serialized-hero.json",
    "bytes": 5627,
    "sha256": "96e4e3a61a07f7bdfa080f5d3cd668a2f805376360b15e79b9ccd51796cf0400"
  },
  "rules": {
    "path": "public/gothic3/player-properties/runtime-rules.json",
    "bytes": 7777,
    "sha256": "3ddecd36537e8b76f48cadd0f618d4941444bc1e4e1b466c47b4d4a309a4a827"
  },
  "nativeEvidence": {
    "path": "assets/gothic3/player-properties/native-evidence.json",
    "bytes": 1154686,
    "sha256": "251833250d6454707c1579e59019344bbdde64a89e8a20a9e1a3a6c11b64d434"
  },
  "seedEvidence": {
    "path": "assets/gothic3/player-properties/seed-evidence.json",
    "bytes": 107554,
    "sha256": "c816284453cee78d59b09b2bd54f6a17899dc99ee622ae14c4d0c865ed51b5df"
  },
  "audit": {
    "entries": 383,
    "instructions": 6088,
    "matchedBytes": 18846,
    "allListedInstructionBytesMatchOriginalPE": true,
    "nativeCodeExecuted": false,
    "testsExecuted": false,
    "buildExecuted": false,
    "browserExecuted": false,
    "sourceSeedAttributes": 15,
    "sourcePropertyValues": 75
  }
}
`);if($a.schema!==`gothic3-player-properties-manifest-v1`||$a.allListedInstructionBytesMatchOriginalPE!==!0||$a.hero.path!==`public/gothic3/player-properties/serialized-hero.json`||$a.rules.path!==`public/gothic3/player-properties/runtime-rules.json`)throw Error(`Original player property receipt differs`);function F(e,t){if(!Number.isInteger(e)||e<-2147483648||e>2147483647)throw RangeError(t+` requires an original int32`);return e}function eo(e,t){if(!Number.isInteger(e)||e<0||e>4294967295)throw RangeError(t+` requires an original uint32`);return e}var to=e=>e|0,I=(e,t)=>to(e+t),no=(e,t)=>to(e-t),ro=(e,t)=>Math.trunc(Math.imul(e,t)/100),L=class{trace=[];applied=[];attempted=[];add(e){this.trace.push(e)}write(e){this.add(e),this.applied.push(e)}attempt(e){this.add(e),this.attempted.push(e)}finish(e){try{return{supported:!0,nativeReturnValue:e(),trace:this.trace,applied:this.applied,attempted:this.attempted}}catch(e){return{supported:!1,nativeReturnValue:null,reason:e instanceof Error?e.message:String(e),partial:this.applied.length>0||this.attempted.length>0,trace:this.trace,applied:this.applied,attempted:this.attempted}}}},io=class e{identity;kind;values;host;physical;detachedReferenceWord=1;detachedWrapper=null;constructor(e,t,n,r=null,i=null){if(this.identity=e,this.kind=t,this.values=n,this.host=r,this.physical=i,!e||!i&&typeof n.Tag!=`string`||![`gCAttribute`,`gCStat`].includes(t)||t===`gCStat`!=`BaseMaximum`in n)throw TypeError(`Supply the actual native attribute class and fields`);i||(F(n.Value,`BaseValue`),F(n.Modifier,`Modifier`),`BaseMaximum`in n&&(F(n.BaseMaximum,`BaseMaximum`),F(n.MaximumModifier,`MaximumModifier`)))}get className(){return this.exact(),this.kind}get referenceWord(){return this.exact(),this.physical?.readReferenceWord()??this.detachedReferenceWord}set referenceWord(e){this.exact(),eo(e,`native reference word`),this.physical?this.physical.writeReferenceWord(e):this.detachedReferenceWord=e,this.exact()}get wrapper(){return this.exact(),this.physical?.readWrapper()??this.detachedWrapper}set wrapper(e){this.exact(),this.physical?this.physical.writeWrapper(e):this.detachedWrapper=e,this.exact()}exact(){this.physical?.guard()}static fromConstructor(t,n,r=null){return new e(t,n,n===`gCStat`?{Tag:``,Modifier:0,Value:100,BaseMaximum:100,MaximumModifier:0}:{Tag:``,Modifier:0,Value:100},r)}getValue(){return this.exact(),I(F(this.values.Value,`live BaseValue`),F(this.values.Modifier,`live Modifier`))}getMaximum(){return this.exact(),`BaseMaximum`in this.values?I(F(this.values.BaseMaximum,`live BaseMaximum`),F(this.values.MaximumModifier,`live MaximumModifier`)):this.getValue()}getBaseValue(){return this.exact(),F(this.values.Value,`live BaseValue`)}getModifier(){return this.exact(),F(this.values.Modifier,`live Modifier`)}getBaseMaximum(){return this.exact(),`BaseMaximum`in this.values?F(this.values.BaseMaximum,`live BaseMaximum`):null}getMaximumModifier(){return this.exact(),`MaximumModifier`in this.values?F(this.values.MaximumModifier,`live MaximumModifier`):null}setValue(e){let t=new L;return t.finish(()=>(this.value(F(e,`Value`),t),null))}read(e,t){let n=e===`Value`?this.getValue():this.getMaximum();return t.add({object:this.identity,operation:`read`,field:e,value:n,source:e===`Value`?`Game:2001acee`:this.kind===`gCStat`?`Game:20027c96`:`Game:20019754`}),n}write(e,t,n,r){if(this.exact(),F(t,e),e===`Value`||e===`Modifier`)this.values[e]=t;else if(`BaseMaximum`in this.values)this.values[e]=t;else throw Error(`Only original gCStat owns `+e);n.write({object:this.identity,operation:`write`,field:e,value:t,source:r})}notify(e,t,n,r=!1){this.exact(),n.add({object:this.identity,operation:e===`enter`?`notify-enter`:`notify-exit`,field:t,value:r,source:e===`enter`?`SharedBase:10001186`:`SharedBase:10005a65`}),n.add({object:this.identity,operation:e===`enter`?`on-notify-enter`:`on-notify-exit`,field:t,value:r,source:e===`enter`?`SharedBase:10008805`:`Game:2002e2b2`}),e===`exit`&&!r&&this.cap(n)}notifyReflectedProperty(e,t){let n=new L;return n.finish(()=>{if(![`Tag`,`Modifier`,`Value`,...this.kind===`gCStat`?[`BaseMaximum`,`MaximumModifier`]:[]].includes(t))throw Error(`Actual registered attribute descriptor required`);return this.notify(e,t,n,!0),null})}notifyTag(e){let t=new L;return t.finish(()=>(this.notify(e,`Tag`,t),null))}value(e,t){this.exact(),this.write(`Value`,no(e,this.getModifier()),t,`Game:20397a70`),this.cap(t)}maximum(e,t){this.exact(),`BaseMaximum`in this.values&&(this.read(`Maximum`,t),this.write(`BaseMaximum`,no(e,F(this.values.MaximumModifier,`MaximumModifier`)),t,`Game:2039aef0`),this.cap(t))}property(e,t,n,r){if(this.exact(),(e===`BaseMaximum`||e===`MaximumModifier`)&&this.kind!==`gCStat`)throw Error(`Only original gCStat owns `+e);let i=e===`Value`?`BaseValue`:e;this.notify(`enter`,i,n),this.write(e,t,n,r??(e===`Value`?`Game:2031d7c0`:e===`Modifier`?`Game:2031d720`:e===`BaseMaximum`?`Game:20009ceb`:`Game:20035efe`)),this.notify(`exit`,i,n)}cap(e){this.exact(),e.add({object:this.identity,operation:`cap`,source:this.kind===`gCStat`?`Game:2039b1d0`:`Game:200213a5`}),this.kind===`gCStat`&&this.read(`Maximum`,e)<0&&this.maximum(0,e);let t=this.read(`Maximum`,e),n=this.read(`Value`,e);t<n?this.value(t,e):n<0&&this.value(0,e)}permanent(e,t,n){if(this.exact(),this.kind===`gCStat`){let r;switch(e){case 1:this.maximum(I(this.read(`Maximum`,n),t),n),this.value(I(this.read(`Value`,n),t),n);break;case 2:r=ro(this.read(`Maximum`,n),t),this.value(I(this.read(`Value`,n),r),n);break;case 3:r=ro(this.read(`Maximum`,n),t),this.maximum(I(this.read(`Maximum`,n),r),n),this.value(I(this.read(`Value`,n),r),n);break;case 5:{let e=this.read(`Maximum`,n);r=no(t,e),this.maximum(e,n),r>0&&this.value(I(this.read(`Value`,n),r),n);break}case 6:this.value(ro(this.read(`Maximum`,n),t),n);break;case 7:{let e=ro(this.read(`Maximum`,n),t);r=no(e,this.read(`Maximum`,n)),this.maximum(e,n),r>0&&this.value(I(this.read(`Value`,n),r),n);break}case 8:this.value(this.read(`Maximum`,n),n)}}return e===0?(this.value(I(this.read(`Value`,n),t),n),!0):e===4&&(this.value(t,n),!0)}temporary(e,t,n,r){if(this.exact(),this.kind===`gCStat`){if(e===1){if(!(`BaseMaximum`in this.values))throw Error(`Missing actual stat fields`);this.write(`MaximumModifier`,n?no(this.values.MaximumModifier,t):I(this.values.MaximumModifier,t),r,n?`Game:2039b150`:`Game:2039b0d0`),this.cap(r)}else if(e===2){let e=n?`Game:2039b196`:`Game:2039b116`,t=`gCStat::`+(n?`UnapplyTemp`:`ApplyTemp`)+` -> EOp_AddPercentageToVal cannot be used as a modifier.`;if(this.host===null)throw Error(e+`: original warning host is unavailable`);r.attempt({object:this.identity,operation:`warning`,value:t,source:e});let i=this.host.warning(t,e);if(!i.known)throw Error(e+`: `+i.reason);this.exact()}else if(e===3){if(!(`BaseMaximum`in this.values))throw Error(`Missing actual stat fields`);let e=BigInt(t)*(n?-1374389535n:1374389535n)>>37n,i=Number(e+(e<0n?1n:0n)),a=BigInt(i)*BigInt(F(this.values.BaseMaximum,`BaseMaximum`));if(a<-2147483648n||a>2147483647n)throw Error(`Game:20465320 needs live CPU conversion flag DWORD207d2b50 for an out-of-int32 product`);if(Math.fround(Number(a))!==Number(a))throw Error(`Game:2039b107/2039b187 needs a live x87 precision/rounding profile for a non-binary32-exact integer product`);this.write(`MaximumModifier`,I(this.values.MaximumModifier,Number(a)),r,n?`Game:2039b150`:`Game:2039b0d0`),this.cap(r)}}return e===0&&(this.write(`Modifier`,n?no(this.getModifier(),t):I(this.getModifier(),t),r,n?`Game:2000f808`:`Game:200259d2`),this.cap(r),!0)}setMaximum(e){let t=new L;return t.finish(()=>(this.maximum(F(e,`Maximum`),t),null))}setBaseValue(e){let t=new L;return t.finish(()=>(this.property(`Value`,F(e,`BaseValue`),t,`Game:2001808e`),null))}setModifier(e){let t=new L;return t.finish(()=>(this.property(`Modifier`,F(e,`Modifier`),t,`Game:20012693`),null))}setBaseMaximum(e){let t=new L;return t.finish(()=>(this.property(`BaseMaximum`,F(e,`BaseMaximum`),t),null))}setMaximumModifier(e){let t=new L;return t.finish(()=>(this.property(`MaximumModifier`,F(e,`MaximumModifier`),t),null))}applyPermanent(e,t){let n=new L;return n.finish(()=>this.permanent(F(e,`Operation`),F(t,`Argument`),n))}applyTemporary(e,t){let n=new L;return n.finish(()=>this.temporary(F(e,`Operation`),F(t,`Argument`),!1,n))}unapplyTemporary(e,t){let n=new L;return n.finish(()=>this.temporary(F(e,`Operation`),F(t,`Argument`),!0,n))}},ao={SetHitPointsMax:{tag:`HP`,maximum:!0},SetHitPoints:{tag:`HP`,maximum:!1},SetManaPointsMax:{tag:`MP`,maximum:!0},SetManaPoints:{tag:`MP`,maximum:!1},SetStaminaPointsMax:{tag:`SP`,maximum:!0},SetStaminaPoints:{tag:`SP`,maximum:!1},SetStrength:{tag:`STR`,maximum:!1},SetDexterity:{tag:`DEX`,maximum:!1},SetIntelligence:{tag:`INT`,maximum:!1},SetSmithing:{tag:`SMT`,maximum:!1},SetTheft:{tag:`THF`,maximum:!1},SetAlchemy:{tag:`ALC`,maximum:!1},SetProtectionBlades:{tag:`PROT_BLADE`,maximum:!1},SetProtectionImpact:{tag:`PROT_IMPACT`,maximum:!1},SetProtectionMissile:{tag:`PROT_MISSILE`,maximum:!1},SetProtectionFire:{tag:`PROT_FIRE`,maximum:!1},SetProtectionIce:{tag:`PROT_ICE`,maximum:!1},SetProtectionLightning:{tag:`PROT_LIGHTNING`,maximum:!1}},oo=class{properties;attributes;constructor(e,t){if(this.properties=e,this.attributes=t,e.kind!==`gCPlayerMemory_PS`)throw TypeError(`Actual gCPlayerMemory_PS pointer required`);for(let t of[`Chapter`,`LPAttribs`,`LPPerks`,`XP`])F(e.values[t],t);eo(e.values.TutorialFlags,`TutorialFlags`)}getAttribute(e){return this.attributes.get(e)??null}getValue(e){return this.getAttribute(e)?.getValue()??0}getMaximum(e){return this.getAttribute(e)?.getMaximum()??0}getBaseValue(e){return this.getAttribute(e)?.getBaseValue()??0}getModifier(e){return this.getAttribute(e)?.getModifier()??0}getChapter(){return F(this.properties.values.Chapter,`live Chapter`)}getLPAttribs(){return F(this.properties.values.LPAttribs,`live LPAttribs`)}getLPPerks(){return F(this.properties.values.LPPerks,`live LPPerks`)}getXP(){return F(this.properties.values.XP,`live XP`)}getTutorialFlags(){return eo(this.properties.values.TutorialFlags,`live TutorialFlags`)}scalar(e,t){let n=new L;return n.finish(()=>{e===`TutorialFlags`?eo(t,e):F(t,e);let r=this.properties,i=`Game:`+{Chapter:`20035c06`,LPAttribs:`20032e98`,LPPerks:`20034c70`,XP:`20018241`,TutorialFlags:`20029654`}[e];for(let a of[`enter`,`exit`]){a===`exit`&&(r.values[e]=t,n.write({object:r.identity,operation:`write`,field:e,value:t,source:i})),n.attempt({object:r.identity,operation:`property-notification`,field:e,source:i});let o=r.notify(a,e,!1);if(n.add({object:r.identity,operation:`property-notification`,field:e,source:i,propertyTrace:o.trace}),!o.supported)throw Error(o.reason)}return null})}setChapter(e){return this.scalar(`Chapter`,e)}setLPAttribs(e){return this.scalar(`LPAttribs`,e)}setLPPerks(e){return this.scalar(`LPPerks`,e)}setXP(e){return this.scalar(`XP`,e)}setTutorialFlags(e){return this.scalar(`TutorialFlags`,e)}enableTutorial(e,t){let n=new L;return n.finish(()=>{eo(e,`Tutorial mask`);let r=this.getTutorialFlags();return this.properties.values.TutorialFlags=(t?r&~e:r|e)>>>0,n.write({object:this.properties.identity,operation:`write`,field:`TutorialFlags`,value:this.properties.values.TutorialFlags,source:`Game:200061c7`}),null})}isTutorialEnabled(e){return eo(e,`Tutorial mask`)!==(this.getTutorialFlags()&e)>>>0}sessionAdapter(){return{isTutorialEnabled:e=>{try{return{known:!0,value:+!!this.isTutorialEnabled(e)}}catch(e){return{known:!1,reason:e instanceof Error?e.message:String(e)}}},enableTutorial:(e,t)=>{let n=this.enableTutorial(e,t);return n.supported?{known:!0,value:void 0}:{known:!1,reason:n.reason}}}}change(e,t,n,r){let i=this.getAttribute(e);if(i===null)return!1;switch(t){case`value`:i.value(n,r);break;case`maximum`:i.maximum(n,r);break;case`base`:i.property(`Value`,n,r);break;case`modifier`:i.property(`Modifier`,n,r);break;case`add-value`:i.value(I(i.getValue(),n),r);break;case`add-maximum`:i.maximum(I(i.getMaximum(),n),r),i.value(I(i.getValue(),n),r);break;case`add-base`:i.property(`Value`,I(i.getBaseValue(),n),r);break;case`add-modifier`:i.property(`Modifier`,I(i.getModifier(),n),r)}return!0}setValue(e,t){let n=new L;return n.finish(()=>this.change(e,`value`,F(t,`Value`),n))}setMaximum(e,t){let n=new L;return n.finish(()=>this.change(e,`maximum`,F(t,`Maximum`),n))}setBaseValue(e,t){let n=new L;return n.finish(()=>this.change(e,`base`,F(t,`BaseValue`),n))}setModifier(e,t){let n=new L;return n.finish(()=>this.change(e,`modifier`,F(t,`Modifier`),n))}addValue(e,t){let n=new L;return n.finish(()=>this.change(e,`add-value`,F(t,`Value`),n))}addMaximum(e,t){let n=new L;return n.finish(()=>this.change(e,`add-maximum`,F(t,`Maximum`),n))}addBaseValue(e,t){let n=new L;return n.finish(()=>this.change(e,`add-base`,F(t,`BaseValue`),n))}addModifier(e,t){let n=new L;return n.finish(()=>this.change(e,`add-modifier`,F(t,`Modifier`),n))}applyMod(e,t,n){let r=new L;return r.finish(()=>(F(t,`Operation`),F(n,`Argument`),this.getAttribute(e)?.temporary(t,n,!1,r)??!1))}unapplyMod(e,t,n){let r=new L;return r.finish(()=>(F(t,`Operation`),F(n,`Argument`),this.getAttribute(e)?.temporary(t,n,!0,r)??!1))}applyStartupStat(e,t){let n=new L;return n.finish(()=>{F(t,e);let r=ao[e];if(!r)throw Error(`Unknown original startup setter`);let{tag:i,maximum:a}=r;if(i===`HP`||i===`SP`){let e=this.getValue(i),r=this.getMaximum(i);if(a)this.change(i,`base`,Math.max(0,e),n),this.change(i,`maximum`,t,n);else{let e=t<1?0:t;r<e&&(e=r),this.change(i,`base`,e,n)}}else this.change(i,a?`maximum`:`base`,t,n);return 1})}},R=JSON.parse(Qa);if(R.schema!==`gothic3-attribute-reading-rules-v1`||R.inputs.Game!==`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`||R.inputs.SharedBase!==`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`||R.classes.gCAttribute.nativeBytes!==24||R.classes.gCStat.nativeBytes!==32||R.classes.gCAttribute.nativeVtable!==`2065da7c`||R.classes.gCStat.nativeVtable!==`2065db4c`||R.classes.gCAttribute.wrapperVtable!==`206a2d94`||R.classes.gCStat.wrapperVtable!==`206a3164`||R.classes.gCAttribute.baseClassName!==null||R.classes.gCStat.baseClassName!==`gCAttribute`)throw Error(`Original reflected Attribute/Stat source profile differs`);var so={gCAttribute:[[`Tag`,12,`bCString`,`Game:20399d80`,`Game:20399b20`],[`Modifier`,16,`int`,`Game:2039a610`,`Game:2039a3c0`],[`Value`,20,`int`,`Game:2039a610`,`Game:2039a3c0`]],gCStat:[[`BaseMaximum`,24,`int`,`Game:2039d2e0`,`Game:2039d090`],[`MaximumModifier`,28,`int`,`Game:2039d2e0`,`Game:2039d090`]]};for(let e of[`gCAttribute`,`gCStat`]){let t=R.classes[e].fields,n=so[e];if(t.length!==n.length||n.some(([e,n,r,i,a],o)=>{let s=t[o];return!s||s.name!==e||s.nativeOffset!==n||s.typeName!==r||s.reader!==i||s.defaultInitializer!==a}))throw Error(`Original registered Attribute/Stat descriptor order differs`)}var co=e=>({known:!0,value:e}),lo=e=>({known:!1,reason:e});function uo(e,t){if(!e.known)throw Error(t+`: `+e.reason);return e.value}function fo(e){if(!Number.isInteger(e)||e<0||e>4294967295)throw Error(`Actual uint32 storage required`);return e}function po(e){let t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,fo(e),!0),t}function mo(e){if(!Number.isInteger(e)||e<-2147483648||e>2147483647)throw Error(`Actual int32 field required`);return e}var ho=class{allocation;length;guard;constructor(e,t,n){this.allocation=e,this.length=t,this.guard=n}memory(){if(this.allocation.freed||this.allocation.bytes.length!==this.length||this.allocation.knownMask.length!==this.length)throw Error(`Actual Attribute allocation lifetime/extent differs`)}get bytes(){return this.memory(),this.allocation.bytes}get knownMask(){return this.memory(),this.allocation.knownMask}range(e,t){if(this.memory(),!Number.isInteger(e)||!Number.isInteger(t)||e<0||t<0||e+t>this.length)throw Error(`Actual Attribute storage bounds differ`)}raw(e,t){if(this.guard(),this.range(e,t),this.knownMask.subarray(e,e+t).some(e=>e!==255))throw Error(`Uninitialized Attribute bytes+`+e.toString(16));return this.bytes.slice(e,e+t)}uint(e){let t=this.raw(e,4);return new DataView(t.buffer).getUint32(0,!0)}write(e,t,n){if(this.guard(),this.range(e,t.length),n&&n.length!==t.length)throw Error(`Actual Attribute mask length differs`);this.bytes.set(t,e),n?this.knownMask.set(n,e):this.knownMask.fill(255,e,e+t.length),this.guard()}put(e,t){this.write(e,po(t))}pointer(e,t){t===null?this.put(e,0):this.write(e,new Uint8Array(4),new Uint8Array(4))}alias(e,t){if(this.guard(),this.range(e,4),t===null?this.uint(e)!==0:this.knownMask.subarray(e,e+4).some(e=>e!==0))throw Error(`Attribute physical pointer slot differs from its retained capability`)}},go=class{nativeOffset;storage;reader;current;constructor(e,t,n){this.nativeOffset=e,this.storage=t,this.reader=n}get pointer(){if(this.reader.guard(),this.current===void 0)throw Error(`Attribute CString is not constructed`);if(this.storage.alias(this.nativeOffset,this.current),this.current?.freed)throw Error(`Attribute CString points to ended data lifetime`);return this.current}set pointer(e){if(this.reader.guard(),e&&(!e.identity||typeof e.text!=`string`||e.length!==e.text.length||e.freed||!Number.isInteger(e.referenceCount)||e.referenceCount<0||e.referenceCount>65535))throw Error(`Actual owned CString allocation required`);this.current=e,this.storage.pointer(this.nativeOffset,e),this.reader.guard()}get text(){return this.pointer?.text??``}},_o=class{controller;host;attributeFactory;statFactory;states=new Map;allocations=new Set;heap=[];active=!1;reentry=!1;hostDepth=0;constructor(e,t){this.controller=e,this.host=t;let n=t=>({root:{className:t,baseClassName:R.classes[t].baseClassName,fields:R.classes[t].fields},nativeCategory:`non-property-set`,cloneRoot:n=>n===e?this.run(()=>this.construct(t)):lo(`Same Attribute reflection controller required`),getVersion:t=>e.value(()=>(this.exact(t),1)),read:(e,t)=>this.run(()=>this.read(e,t))});this.attributeFactory=n(`gCAttribute`),this.statFactory=n(`gCStat`),uo(e.registerFactory(this.attributeFactory),`actual gCAttribute factory`),uo(e.registerFactory(this.statFactory),`actual gCStat factory`)}guard(){if(this.reentry)throw Error(`Reentrant Attribute mutation is blocked`);let e=this.controller.receipt().required;if(e!==null)throw Error(e)}run(e){if(this.active)return this.reentry=!0,this.controller.value(()=>{throw Error(`Public reentrant Attribute operation is outside the original selected profile`)});this.active=!0;try{return this.controller.value(()=>{this.guard();let t=e();return this.guard(),t})}finally{this.active=!1}}note(e,t){this.guard(),this.controller.write(e,t),this.guard()}effect(e,t,n){this.guard();let r=this.controller.effect(e,t,()=>{this.hostDepth++;try{return n()}finally{this.hostDepth--}});return this.guard(),r}runtimeGuard(e){if(this.hostDepth!==0)throw this.reentry=!0,Error(`Native Attribute consumer access during an ownership callback is outside the selected profile`);this.validateState(e)}fresh(e,t){if(!e||!e.identity||e.freed||e.bytes.length!==t||e.knownMask.length!==t||e.knownMask.some(e=>e!==0)||this.allocations.has(e.identity))throw Error(`Selected successful fresh exact Attribute allocation/uninitialized mask required`);if(this.heap.some(n=>!n.freed&&n.bytes.buffer===e.bytes.buffer&&n.bytes.byteOffset<e.bytes.byteOffset+t&&e.bytes.byteOffset<n.bytes.byteOffset+n.bytes.length))throw Error(`Fresh native Attribute allocation overlaps an actual retained allocation`);return this.allocations.add(e.identity),this.heap.push(e),e}retainedAllocations(){return this.heap.slice()}factory(e){return e===`gCAttribute`?this.attributeFactory:this.statFactory}validateState(e){if(this.guard(),e.wrapper.deleted||this.states.get(e.wrapper)!==e||e.storage.allocation.freed||e.wrapperStorage.allocation.freed)throw Error(`Same live Attribute allocation required`);if(Object.getPrototypeOf(e.native)!==io.prototype||e.wrapperStorage.uint(0)!==parseInt(R.classes[e.native.kind].wrapperVtable,16))throw Error(`Original concrete Attribute instance/wrapper dispatch required`);let t=e.wrapperStorage.knownMask,n=e.wrapperStorage.bytes,r=new DataView(t.buffer,t.byteOffset).getUint32(4,!0),i=new DataView(n.buffer,n.byteOffset).getUint32(4,!0);if(r!==134217727||(i&7)!=2)throw Error(`Actual Attribute wrapper count/root/embedded flag profile required`);e.wrapperStorage.alias(12,e.wrapper.factory);let a=this.controller.allocations().find(t=>t.wrapper===e.wrapper);if(!a||a.nativeObject!==e.native&&!(e.constructing&&a.nativeObject===null))throw Error(`Same retained OriginalNativeAttribute required`);if([`attached`,`initialized`,`read`].includes(a.phase)&&(e.wrapper.native!==e.native||e.nativeWrapper!==e.wrapper))throw Error(`Actual attached Attribute pointer relation changed outside a source lifetime operation`);if([`attached`,`initialized`,`read`].includes(a.phase)&&i>>>3&16777215&&e.storage.uint(8)!==2147483649)throw Error(`Attached native Attribute physical count1/created bit differs from delegated wrapper ownership`);if(e.storage.alias(4,e.nativeWrapper),!e.constructing&&e.storage.uint(0)!==parseInt(R.classes[e.native.kind].nativeVtable,16))throw Error(`Actual original Attribute leaf vtable required`)}exact(e){this.guard();let t=this.states.get(e);if(!t||e.factory!==this.factory(t.native.kind))throw Error(`Actual registered Attribute/Stat wrapper required`);if(this.validateState(t),t.constructing||e.native!==t.native||t.nativeWrapper!==e)throw Error(`Actual same attached Attribute native object required`);return t}stateFor(e){let t=[...this.states.values()].find(t=>t.native===e);if(!t)throw Error(`Actual retained Attribute capability required`);return this.validateState(t),t}attribute(e){let t=this.controller.value(()=>(this.guard(),e.controller===this.controller&&e.factory!==this.attributeFactory&&e.factory!==this.statFactory&&e.factory.nativeCategory!==void 0&&!e.deleted&&this.controller.allocations().some(t=>t.wrapper===e&&t.nativeObject===e.native&&t.nativeObject!==null)?null:this.exact(e).native));return t.known?t.value===null?lo(`Actual known other concrete class fails gCAttribute RTTI cast`):co(t.value):t}storage(e){return this.controller.value(()=>this.stateFor(e).storage)}tag(e){return this.controller.value(()=>this.stateFor(e).tag)}notification(e){for(let t of e.trace)this.note(t.operation+` `+(t.field??``)+(t.value===void 0?``:`=`+t.value),t.source);if(!e.supported)throw Error(e.reason)}text(e,t){if(this.effect(`actual CString char-pointer assignment/SetText ownership`,`SharedBase:10006479`,()=>this.host.assignCStringText?.(e,t)),e.text!==t)throw Error(`CString assignment did not store original text`)}clear(e){let t=e.pointer;if(t===null||t.length===0){this.note(`CString.Clear preserves NULL/allocated-empty`,`SharedBase:100149b0`);return}if(t.referenceCount=t.referenceCount-1&65535,this.note(`CString.Clear captured ushort decrement`,`SharedBase:100149b0`),t.referenceCount===0&&(this.effect(`actual CString data Free`,`SharedBase:100149b0`,()=>this.host.freeCString?.(t)),!t.freed))throw Error(`CString Free did not end actual captured lifetime`);e.pointer=null,this.note(`CString.Clear nonempty pointerNULL`,`SharedBase:100149b0`)}defaults(e,t){let n=t?543546188:543545980;if(e.storage.uint(0)!==n)throw Error(`Actual ApplyDefaults leaf dispatch required`);if(t&&(e.storage.put(24,100),e.storage.put(28,0),this.note(`Stat.ApplyDefaults own100/0 before inherited defaults`,`Game:2039aea0`)),this.text(e.tag,``),this.validateState(e),e.storage.uint(0)!==n)throw Error(`Captured ApplyDefaults receiver dispatch changed during CString callback`);e.storage.put(20,100),e.storage.put(16,0),this.note(`Attribute.ApplyDefaults Tagempty Value100 Modifier0`,`Game:20013ed5`)}bindWrapper(e,t,n){let r=null;Object.defineProperty(e,"native",{get:()=>(this.guard(),t.alias(8,r),r),set:n=>{if(this.guard(),n!==null&&this.states.get(e)?.native!==n)throw Error(`Same retained Attribute wrapper native required`);r=n,t.pointer(8,n)}}),Object.defineProperties(e.flags,{value:{get:()=>{this.guard();let e=t.bytes;return new DataView(e.buffer,e.byteOffset).getUint32(4,!0)},set:e=>{t.write(4,po(e),t.knownMask.slice(4,8))}},knownMask:{get:()=>{this.guard();let e=t.knownMask;return new DataView(e.buffer,e.byteOffset).getUint32(4,!0)},set:e=>{t.write(4,t.bytes.slice(4,8),po(e))}}}),t.write(4,po(0),po(134217720)),t.put(0,269394468),t.write(4,po(10),po(134217727)),this.note(`wrapper base ctor staged count mask/reference1/nonroot flags`,`SharedBase:10089290`),t.pointer(8,null),t.put(0,parseInt(R.classes[n].wrapperVtable,16)),t.pointer(12,e.factory),this.note(`wrapper16B original vtable/flags/nonroot/nativeNULL/type capability`,n===`gCAttribute`?`Game:2039a790`:`Game:2039d460`)}construct(e){let t=e===`gCAttribute`?`Game:2039a790`:`Game:2039d460`,n=this.fresh(this.effect(`actual new16/tag190 wrapper`,t,()=>this.host.allocateWrapper?.(16,400,e)),16),r=this.controller.allocateWrapper(this.factory(e),t),i=new ho(n,16,()=>{if(this.guard(),r.deleted)throw Error(`Ended Attribute wrapper lifetime`)});this.bindWrapper(r,i,e);let a=R.classes[e].nativeBytes,o=e===`gCAttribute`?`Game:203980f0`:`Game:2039b680`,s=new ho(this.fresh(this.effect(`actual new`+a+`/tagc4 native`,o,()=>this.host.allocateNative?.(a,196,e,r)),a),a,()=>this.guard()),c=new go(12,s,this),l,u={};Object.defineProperty(u,"Tag",{enumerable:!0,get:()=>(this.runtimeGuard(l),c.text),set:e=>{if(this.runtimeGuard(l),typeof e!=`string`)throw Error(`Actual Tag text required`);this.text(c,e),this.runtimeGuard(l)}});let d=e===`gCStat`?[...R.classes.gCAttribute.fields,...R.classes.gCStat.fields]:R.classes.gCAttribute.fields;for(let e of d.filter(e=>e.typeName===`int`))Object.defineProperty(u,e.name,{enumerable:!0,get:()=>(this.runtimeGuard(l),s.uint(e.nativeOffset)|0),set:t=>{this.runtimeGuard(l),s.put(e.nativeOffset,mo(t)>>>0),this.runtimeGuard(l)}});let f=new io(r.identity+`:native`,e,u,{warning:(e,t)=>this.controller.value(()=>{this.effect(`actual Attribute warning`,t,()=>this.host.warning?.(e,t))})},{guard:()=>this.runtimeGuard(l),readReferenceWord:()=>s.uint(8),writeReferenceWord:e=>s.put(8,e),readWrapper:()=>(s.alias(4,l.nativeWrapper),l.nativeWrapper),writeWrapper:e=>{if(e!==null&&e!==r)throw Error(`Same native Attribute wrapper required`);l.nativeWrapper=e,s.pointer(4,e)}});return Object.freeze(u),Object.freeze(f),l={wrapper:r,wrapperStorage:i,storage:s,tag:c,native:f,nativeWrapper:null,constructing:!0},this.states.set(r,l),s.put(0,269385244),s.put(4,0),s.put(0,269385388),s.put(8,1),this.controller.retainObject(r,f),this.note(`staged RefBase ctor wrapperNULL/reference1 on same object`,`SharedBase:10001d07`),s.put(0,543545980),c.pointer=null,this.note(`Attribute leaf/CStringNULL before virtual ApplyDefaults`,`Game:20397cd0`),this.defaults(l,!1),e===`gCStat`&&(s.put(0,543546188),this.note(`Stat leaf after completed Attribute base constructor`,`Game:2039b270`),this.defaults(l,!0)),l.constructing=!1,f.referenceWord=(f.referenceWord|2147483648)>>>0,this.note(`virtual SharedBase.Create returns1 and sets created bit31`,`SharedBase:100079fa`),this.controller.setAllocationPhase(r,`created`),this.controller.attachConstructedNative(r,f,e===`gCAttribute`?`Game:20397e60`:`Game:2039b400`,o),this.controller.initializeProperties(r,e=>this.controller.value(()=>{let t=this.exact(r);e.typeName===`bCString`?this.clear(t.tag):t.storage.put(e.nativeOffset,4294967295),this.note(`actual descriptor default `+e.name+` without notification`,e.defaultInitializer)}),()=>this.controller.value(()=>{let t=this.exact(r);this.defaults(t,e===`gCStat`),this.note(`PostInitialize virtual ApplyDefaults`,`Game:20397ca0`)}),e===`gCAttribute`?`Game:20398b00`:`Game:2039c070`),r}indexedString(e,t){let n=t.cursor(),r=n+2<=t.end?new DataView(t.bytes.buffer,t.bytes.byteOffset+n,2).getUint16(0,!0):-1,i=t.strings[r];if(typeof i!=`string`)throw Error(`Original indexed Attribute CString source is absent`);if(this.effect(`actual indexed CString Read/SetText ownership`,`SharedBase:10015430`,()=>this.host.readCString?.(e,t)),t.cursor()!==n+2||e.text!==i)throw Error(`Attribute CString service did not consume/store exact indexed source`)}read(e,t){let n=this.exact(e).native.kind;return this.controller.readWrapperProperties(e,t,{wrapperSource:n===`gCAttribute`?`Game:20398c90`:`Game:2039c210`,dataSource:n===`gCAttribute`?`Game:2039aa80`:`Game:2039d680`,readField:(t,n)=>this.controller.value(()=>{n.u16(),n.u32(),this.notification(this.exact(e).native.notifyReflectedProperty(`enter`,t.name));let r=this.exact(e);if(t.typeName===`bCString`)this.indexedString(r.tag,n);else if(t.typeName===`int`)r.storage.write(t.nativeOffset,n.take(4));else throw Error(`Unproved Attribute descriptor payload`);this.notification(this.exact(e).native.notifyReflectedProperty(`exit`,t.name))}),readNative:t=>this.controller.value(()=>{this.exact(e),t.u16(),this.note(`SharedBase.Read consumes native version only; returns1`,`SharedBase:100073ce`)})})}addReference(e){this.stateFor(e);let t=e.wrapper;if(t!==null)return this.note(`native AddReference delegates current wrapper virtual+30`,`SharedBase:100022d4`),uo(t.addReference(),`actual native wrapper AddReference`);let n=e.referenceWord;return e.referenceWord=((n+1^n)&2147483647^n)>>>0,this.note(`native AddReference physical31-bit count increment`,`SharedBase:100022d4`),e.referenceWord&2147483647}nativeAddReference(e){return this.run(()=>this.addReference(e))}nativeReleaseReference(e){return this.run(()=>{let t=this.stateFor(e),n=e.wrapper;if(n!==null&&uo(n.getReferenceCount(),`actual wrapper count`)!==0){this.note(`native ReleaseReference delegates live wrapper virtual+34`,`SharedBase:1000551a`),this.hostDepth++;try{return uo(n.releaseReference(),`actual native wrapper ReleaseReference`)}finally{this.hostDepth--}}let r=e.referenceWord;if((r&2147483647)>1)return e.referenceWord=((r-1^r)&2147483647^r)>>>0,this.note(`native ReleaseReference physical31-bit decrement`,`SharedBase:1000551a`),e.referenceWord&2147483647;if(e.referenceWord=(r&2147483648)>>>0,this.note(`native last reference clear before captured destructor`,`SharedBase:1000551a`),this.effect(`actual native deleting destructor arg0`,`SharedBase:1000551a`,()=>this.host.deletingNative?.(e,0)),this.effect(`actual native MemoryAdmin.DeleteObject`,`SharedBase:1000551a`,()=>this.host.freeNative?.(t.storage.allocation)),!t.storage.allocation.freed)throw Error(`Native DeleteObject did not end captured allocation lifetime`);return 0})}create(e){return this.run(()=>{if(e!==`gCAttribute`&&e!==`gCStat`)throw Error(`Actual native Attribute/Stat class required`);let t=e===`gCAttribute`?`Game:20320af0`:`Game:20320b80`,n=this.construct(e);this.note(`QueryNewObject returns actual root Clone into temporary creator`,t),uo(n.addReference(),`creator SetInstance incoming`),uo(n.releaseReference(),`creator SetInstance captured same old pointer`),this.note(`creator SetInstance same pointer add/release/assignment`,`SharedBase:1000574f`);let r=this.exact(n).native;this.addReference(r);let i=this.exact(n).native;return this.effect(`create helper ErrorAdmin.IsInPanicState`,`SharedBase:10007356`,()=>this.controller.clockHost.isInPanicState())||uo(n.releaseReference(),`create helper creator destructor`),this.note(`create helper returns same native capability`,t),i})}setTag(e,t){return this.run(()=>{let n=this.stateFor(e);this.notification(e.notifyTag(`enter`));let r=t.pointer,i=t.text;if(this.effect(`actual CString reference assignment for SetTag`,`SharedBase:10004638`,()=>this.host.assignCString?.(n.tag,t)),this.stateFor(e),t.pointer!==r||t.text!==i||n.tag.text!==i)throw Error(`SetTag actual source/destination assignment differs`);this.notification(e.notifyTag(`exit`)),this.note(`SetTag false notification/CString assignment/Cap complete`,`Game:200111b7`)})}},vo=`{
  "schema": "gothic3-player-memory-reading-rules-v1",
  "nativeCodeExecuted": false,
  "inputs": {
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214",
    "Engine": "d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3",
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f"
  },
  "classes": {
    "gCPlayerMemory_PS": {
      "nativeBytes": 184,
      "allocationTag": 196,
      "propertyType": 60,
      "nativeVtable": "2069845c",
      "wrapperVtable": "20697d2c",
      "rootRegistrar": "Game:205184d0",
      "rootObject": "207c1638",
      "constructor": "Game:2031e9c0",
      "constructorExport": "Game:20036cdc",
      "copyConstructorExport": "Game:2000cce3",
      "copyConstructor": "Game:2031e440",
      "copyConstructorIsFresh": false,
      "allocator": "Game:20327f10",
      "wrapperClone": "Game:20328880",
      "initialize": "Game:20328570",
      "attach": "Game:2031f540",
      "wrapperRead": "Game:20320970",
      "dataRead": "Game:20328200",
      "nativeVersion": 5,
      "nativeObjectVersion": 6,
      "getVersion": 6,
      "nativeReadVersion": 5,
      "fields": [
        {
          "className": "gCPlayerMemory_PS",
          "name": "HideTips",
          "nativeOffset": 20,
          "typeName": "bool",
          "registrar": "Game:20518530",
          "reader": "Game:203221c0",
          "defaultInitializer": "Game:20321f70",
          "addressGetter": "Game:20321d50",
          "descriptor": "207c1648",
          "vtable": "20697e0c",
          "descriptorStore": {
            "address": "20518579",
            "bytes": "c70548167c200c7e6920",
            "assembly": "MOV dword ptr [0x207c1648],0x20697e0c"
          },
          "offsetStore": {
            "address": "20518592",
            "bytes": "c70564167c2014000000",
            "assembly": "MOV dword ptr [0x207c1664],0x14"
          },
          "defaultStore": {
            "address": "2051859c",
            "bytes": "c70568167c2000000000",
            "assembly": "MOV dword ptr [0x207c1668],0x0"
          },
          "nameLiteral": {
            "address": "2065dbf0",
            "bytes": "486964655469707300",
            "instruction": {
              "address": "20518550",
              "bytes": "68f0db6520",
              "assembly": "PUSH 0x2065dbf0"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dbf0",
              "bytes": "486964655469707300",
              "instruction": {
                "address": "20518550",
                "bytes": "68f0db6520",
                "assembly": "PUSH 0x2065dbf0"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero byte at actual descriptor-resolved destination",
            "value": false,
            "bytes": "00",
            "source": "Game:20321f70",
            "nativeOffset": 20,
            "typeName": "bool"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "PlayerKnows",
          "nativeOffset": 24,
          "typeName": "bTObjArray<class bCString>",
          "registrar": "Game:20518620",
          "reader": "Game:20327040",
          "defaultInitializer": "Game:20322670",
          "addressGetter": "Game:20322450",
          "descriptor": "207c166c",
          "vtable": "20697e94",
          "descriptorStore": {
            "address": "20518669",
            "bytes": "c7056c167c20947e6920",
            "assembly": "MOV dword ptr [0x207c166c],0x20697e94"
          },
          "offsetStore": {
            "address": "20518682",
            "bytes": "c70588167c2018000000",
            "assembly": "MOV dword ptr [0x207c1688],0x18"
          },
          "defaultStore": {
            "address": "2051868c",
            "bytes": "c7058c167c2000000000",
            "assembly": "MOV dword ptr [0x207c168c],0x0"
          },
          "nameLiteral": {
            "address": "2065e2bc",
            "bytes": "506c617965724b6e6f777300",
            "instruction": {
              "address": "20518640",
              "bytes": "68bce26520",
              "assembly": "PUSH 0x2065e2bc"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065e2bc",
              "bytes": "506c617965724b6e6f777300",
              "instruction": {
                "address": "20518640",
                "bytes": "68bce26520",
                "assembly": "PUSH 0x2065e2bc"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
            "payloadWritten": false,
            "freshEmptyHeaderFromConstructor": true,
            "source": "Game:20322670",
            "nativeOffset": 24,
            "typeName": "bTObjArray<class bCString>"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "PoliticalFame",
          "nativeOffset": 36,
          "typeName": "bTValArray<long>",
          "registrar": "Game:20518710",
          "reader": "Game:20326cb0",
          "defaultInitializer": "Game:20322ac0",
          "addressGetter": "Game:203228a0",
          "descriptor": "207c1690",
          "vtable": "20697f1c",
          "descriptorStore": {
            "address": "20518759",
            "bytes": "c70590167c201c7f6920",
            "assembly": "MOV dword ptr [0x207c1690],0x20697f1c"
          },
          "offsetStore": {
            "address": "20518772",
            "bytes": "c705ac167c2024000000",
            "assembly": "MOV dword ptr [0x207c16ac],0x24"
          },
          "defaultStore": {
            "address": "2051877c",
            "bytes": "c705b0167c2000000000",
            "assembly": "MOV dword ptr [0x207c16b0],0x0"
          },
          "nameLiteral": {
            "address": "2065e2cc",
            "bytes": "506f6c69746963616c46616d6500",
            "instruction": {
              "address": "20518730",
              "bytes": "68cce26520",
              "assembly": "PUSH 0x2065e2cc"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065e2cc",
              "bytes": "506f6c69746963616c46616d6500",
              "instruction": {
                "address": "20518730",
                "bytes": "68cce26520",
                "assembly": "PUSH 0x2065e2cc"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
            "payloadWritten": false,
            "freshEmptyHeaderFromConstructor": true,
            "source": "Game:20322ac0",
            "nativeOffset": 36,
            "typeName": "bTValArray<long>"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "PoliticalSuspectComment",
          "nativeOffset": 48,
          "typeName": "bTValArray<long>",
          "registrar": "Game:20518800",
          "reader": "Game:20326cb0",
          "defaultInitializer": "Game:20322ac0",
          "addressGetter": "Game:203228a0",
          "descriptor": "207c16b4",
          "vtable": "20697f1c",
          "descriptorStore": {
            "address": "20518849",
            "bytes": "c705b4167c201c7f6920",
            "assembly": "MOV dword ptr [0x207c16b4],0x20697f1c"
          },
          "offsetStore": {
            "address": "20518862",
            "bytes": "c705d0167c2030000000",
            "assembly": "MOV dword ptr [0x207c16d0],0x30"
          },
          "defaultStore": {
            "address": "2051886c",
            "bytes": "c705d4167c2000000000",
            "assembly": "MOV dword ptr [0x207c16d4],0x0"
          },
          "nameLiteral": {
            "address": "2065e2dc",
            "bytes": "506f6c69746963616c53757370656374436f6d6d656e7400",
            "instruction": {
              "address": "20518820",
              "bytes": "68dce26520",
              "assembly": "PUSH 0x2065e2dc"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065e2dc",
              "bytes": "506f6c69746963616c53757370656374436f6d6d656e7400",
              "instruction": {
                "address": "20518820",
                "bytes": "68dce26520",
                "assembly": "PUSH 0x2065e2dc"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
            "payloadWritten": false,
            "freshEmptyHeaderFromConstructor": true,
            "source": "Game:20322ac0",
            "nativeOffset": 48,
            "typeName": "bTValArray<long>"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "PoliticalCrimeCount",
          "nativeOffset": 60,
          "typeName": "bTValArray<long>",
          "registrar": "Game:205188f0",
          "reader": "Game:20326cb0",
          "defaultInitializer": "Game:20322ac0",
          "addressGetter": "Game:203228a0",
          "descriptor": "207c16d8",
          "vtable": "20697f1c",
          "descriptorStore": {
            "address": "20518939",
            "bytes": "c705d8167c201c7f6920",
            "assembly": "MOV dword ptr [0x207c16d8],0x20697f1c"
          },
          "offsetStore": {
            "address": "20518952",
            "bytes": "c705f4167c203c000000",
            "assembly": "MOV dword ptr [0x207c16f4],0x3c"
          },
          "defaultStore": {
            "address": "2051895c",
            "bytes": "c705f8167c2000000000",
            "assembly": "MOV dword ptr [0x207c16f8],0x0"
          },
          "nameLiteral": {
            "address": "2065e2f8",
            "bytes": "506f6c69746963616c4372696d65436f756e7400",
            "instruction": {
              "address": "20518910",
              "bytes": "68f8e26520",
              "assembly": "PUSH 0x2065e2f8"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065e2f8",
              "bytes": "506f6c69746963616c4372696d65436f756e7400",
              "instruction": {
                "address": "20518910",
                "bytes": "68f8e26520",
                "assembly": "PUSH 0x2065e2f8"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
            "payloadWritten": false,
            "freshEmptyHeaderFromConstructor": true,
            "source": "Game:20322ac0",
            "nativeOffset": 60,
            "typeName": "bTValArray<long>"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "PoliticalPlayerCrime",
          "nativeOffset": 72,
          "typeName": "bTValArray<bool>",
          "registrar": "Game:205189e0",
          "reader": "Game:20326db0",
          "defaultInitializer": "Game:20322f50",
          "addressGetter": "Game:20322cf0",
          "descriptor": "207c16fc",
          "vtable": "20697fa4",
          "descriptorStore": {
            "address": "20518a29",
            "bytes": "c705fc167c20a47f6920",
            "assembly": "MOV dword ptr [0x207c16fc],0x20697fa4"
          },
          "offsetStore": {
            "address": "20518a42",
            "bytes": "c70518177c2048000000",
            "assembly": "MOV dword ptr [0x207c1718],0x48"
          },
          "defaultStore": {
            "address": "20518a4c",
            "bytes": "c7051c177c2000000000",
            "assembly": "MOV dword ptr [0x207c171c],0x0"
          },
          "nameLiteral": {
            "address": "2065e310",
            "bytes": "506f6c69746963616c506c617965724372696d6500",
            "instruction": {
              "address": "20518a00",
              "bytes": "6810e36520",
              "assembly": "PUSH 0x2065e310"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065e310",
              "bytes": "506f6c69746963616c506c617965724372696d6500",
              "instruction": {
                "address": "20518a00",
                "bytes": "6810e36520",
                "assembly": "PUSH 0x2065e310"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
            "payloadWritten": false,
            "freshEmptyHeaderFromConstructor": true,
            "source": "Game:20322f50",
            "nativeOffset": 72,
            "typeName": "bTValArray<bool>"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "XP",
          "nativeOffset": 84,
          "typeName": "long",
          "registrar": "Game:20518ad0",
          "reader": "Game:203237d0",
          "defaultInitializer": "Game:20323580",
          "addressGetter": "Game:20323360",
          "descriptor": "207c1720",
          "vtable": "2069802c",
          "descriptorStore": {
            "address": "20518b19",
            "bytes": "c70520177c202c806920",
            "assembly": "MOV dword ptr [0x207c1720],0x2069802c"
          },
          "offsetStore": {
            "address": "20518b32",
            "bytes": "c7053c177c2054000000",
            "assembly": "MOV dword ptr [0x207c173c],0x54"
          },
          "defaultStore": {
            "address": "20518b3c",
            "bytes": "c70540177c2000000000",
            "assembly": "MOV dword ptr [0x207c1740],0x0"
          },
          "nameLiteral": {
            "address": "2065dbfc",
            "bytes": "585000",
            "instruction": {
              "address": "20518af0",
              "bytes": "68fcdb6520",
              "assembly": "PUSH 0x2065dbfc"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dbfc",
              "bytes": "585000",
              "instruction": {
                "address": "20518af0",
                "bytes": "68fcdb6520",
                "assembly": "PUSH 0x2065dbfc"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20323580",
            "nativeOffset": 84,
            "typeName": "long"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "LPAttribs",
          "nativeOffset": 88,
          "typeName": "long",
          "registrar": "Game:20518bc0",
          "reader": "Game:203237d0",
          "defaultInitializer": "Game:20323580",
          "addressGetter": "Game:20323360",
          "descriptor": "207c1744",
          "vtable": "2069802c",
          "descriptorStore": {
            "address": "20518c09",
            "bytes": "c70544177c202c806920",
            "assembly": "MOV dword ptr [0x207c1744],0x2069802c"
          },
          "offsetStore": {
            "address": "20518c22",
            "bytes": "c70560177c2058000000",
            "assembly": "MOV dword ptr [0x207c1760],0x58"
          },
          "defaultStore": {
            "address": "20518c2c",
            "bytes": "c70564177c2000000000",
            "assembly": "MOV dword ptr [0x207c1764],0x0"
          },
          "nameLiteral": {
            "address": "2065dc00",
            "bytes": "4c504174747269627300",
            "instruction": {
              "address": "20518be0",
              "bytes": "6800dc6520",
              "assembly": "PUSH 0x2065dc00"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dc00",
              "bytes": "4c504174747269627300",
              "instruction": {
                "address": "20518be0",
                "bytes": "6800dc6520",
                "assembly": "PUSH 0x2065dc00"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20323580",
            "nativeOffset": 88,
            "typeName": "long"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "LPPerks",
          "nativeOffset": 92,
          "typeName": "long",
          "registrar": "Game:20518cb0",
          "reader": "Game:203237d0",
          "defaultInitializer": "Game:20323580",
          "addressGetter": "Game:20323360",
          "descriptor": "207c1768",
          "vtable": "2069802c",
          "descriptorStore": {
            "address": "20518cf9",
            "bytes": "c70568177c202c806920",
            "assembly": "MOV dword ptr [0x207c1768],0x2069802c"
          },
          "offsetStore": {
            "address": "20518d12",
            "bytes": "c70584177c205c000000",
            "assembly": "MOV dword ptr [0x207c1784],0x5c"
          },
          "defaultStore": {
            "address": "20518d1c",
            "bytes": "c70588177c2000000000",
            "assembly": "MOV dword ptr [0x207c1788],0x0"
          },
          "nameLiteral": {
            "address": "2065dc0c",
            "bytes": "4c505065726b7300",
            "instruction": {
              "address": "20518cd0",
              "bytes": "680cdc6520",
              "assembly": "PUSH 0x2065dc0c"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dc0c",
              "bytes": "4c505065726b7300",
              "instruction": {
                "address": "20518cd0",
                "bytes": "680cdc6520",
                "assembly": "PUSH 0x2065dc0c"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20323580",
            "nativeOffset": 92,
            "typeName": "long"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "SecondsTransformRemain",
          "nativeOffset": 124,
          "typeName": "float",
          "registrar": "Game:20518da0",
          "reader": "Game:20325290",
          "defaultInitializer": "Game:20325030",
          "addressGetter": "Game:20324e10",
          "descriptor": "207c178c",
          "vtable": "206981c4",
          "descriptorStore": {
            "address": "20518de9",
            "bytes": "c7058c177c20c4816920",
            "assembly": "MOV dword ptr [0x207c178c],0x206981c4"
          },
          "offsetStore": {
            "address": "20518e02",
            "bytes": "c705a8177c207c000000",
            "assembly": "MOV dword ptr [0x207c17a8],0x7c"
          },
          "defaultStore": {
            "address": "20518e0c",
            "bytes": "c705ac177c2000000000",
            "assembly": "MOV dword ptr [0x207c17ac],0x0"
          },
          "nameLiteral": {
            "address": "2065dc18",
            "bytes": "5365636f6e64735472616e73666f726d52656d61696e00",
            "instruction": {
              "address": "20518dc0",
              "bytes": "6818dc6520",
              "assembly": "PUSH 0x2065dc18"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dc18",
              "bytes": "5365636f6e64735472616e73666f726d52656d61696e00",
              "instruction": {
                "address": "20518dc0",
                "bytes": "6818dc6520",
                "assembly": "PUSH 0x2065dc18"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20325030",
            "nativeOffset": 124,
            "typeName": "float"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "SecondsMistRemain",
          "nativeOffset": 128,
          "typeName": "float",
          "registrar": "Game:20518e90",
          "reader": "Game:20325290",
          "defaultInitializer": "Game:20325030",
          "addressGetter": "Game:20324e10",
          "descriptor": "207c17b0",
          "vtable": "206981c4",
          "descriptorStore": {
            "address": "20518ed9",
            "bytes": "c705b0177c20c4816920",
            "assembly": "MOV dword ptr [0x207c17b0],0x206981c4"
          },
          "offsetStore": {
            "address": "20518ef2",
            "bytes": "c705cc177c2080000000",
            "assembly": "MOV dword ptr [0x207c17cc],0x80"
          },
          "defaultStore": {
            "address": "20518efc",
            "bytes": "c705d0177c2000000000",
            "assembly": "MOV dword ptr [0x207c17d0],0x0"
          },
          "nameLiteral": {
            "address": "2065dc34",
            "bytes": "5365636f6e64734d69737452656d61696e00",
            "instruction": {
              "address": "20518eb0",
              "bytes": "6834dc6520",
              "assembly": "PUSH 0x2065dc34"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dc34",
              "bytes": "5365636f6e64734d69737452656d61696e00",
              "instruction": {
                "address": "20518eb0",
                "bytes": "6834dc6520",
                "assembly": "PUSH 0x2065dc34"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20325030",
            "nativeOffset": 128,
            "typeName": "float"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "LastWeaponConfig",
          "nativeOffset": 96,
          "typeName": "bTPropertyContainer<enum gEWeaponConfig>",
          "registrar": "Game:20518f80",
          "reader": "Game:20324140",
          "defaultInitializer": "Game:20323ee0",
          "addressGetter": "Game:20323bf0",
          "descriptor": "207c17d4",
          "vtable": "206980b4",
          "descriptorStore": {
            "address": "20518fc9",
            "bytes": "c705d4177c20b4806920",
            "assembly": "MOV dword ptr [0x207c17d4],0x206980b4"
          },
          "offsetStore": {
            "address": "20518fe2",
            "bytes": "c705f0177c2060000000",
            "assembly": "MOV dword ptr [0x207c17f0],0x60"
          },
          "defaultStore": {
            "address": "20518fec",
            "bytes": "c705f4177c2000000000",
            "assembly": "MOV dword ptr [0x207c17f4],0x0"
          },
          "nameLiteral": {
            "address": "2065e23c",
            "bytes": "4c617374576561706f6e436f6e66696700",
            "instruction": {
              "address": "20518fa0",
              "bytes": "683ce26520",
              "assembly": "PUSH 0x2065e23c"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065e23c",
              "bytes": "4c617374576561706f6e436f6e66696700",
              "instruction": {
                "address": "20518fa0",
                "bytes": "683ce26520",
                "assembly": "PUSH 0x2065e23c"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "dispatch actual embedded container +0x18; 20320a30 copies mutable global207c1578",
            "liveValueKnown": false,
            "liveGlobal": "207c1578",
            "source": "Game:20323ee0",
            "nativeOffset": 96,
            "typeName": "bTPropertyContainer<enum gEWeaponConfig>"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "LastSpell",
          "nativeOffset": 104,
          "typeName": "bCPropertyID",
          "registrar": "Game:20519070",
          "reader": "Game:203249e0",
          "defaultInitializer": "Game:20324780",
          "addressGetter": "Game:20324560",
          "descriptor": "207c17f8",
          "vtable": "2069813c",
          "descriptorStore": {
            "address": "205190b9",
            "bytes": "c705f8177c203c816920",
            "assembly": "MOV dword ptr [0x207c17f8],0x2069813c"
          },
          "offsetStore": {
            "address": "205190d2",
            "bytes": "c70514187c2068000000",
            "assembly": "MOV dword ptr [0x207c1814],0x68"
          },
          "defaultStore": {
            "address": "205190dc",
            "bytes": "c70518187c2000000000",
            "assembly": "MOV dword ptr [0x207c1818],0x0"
          },
          "nameLiteral": {
            "address": "20656894",
            "bytes": "4c6173745370656c6c00",
            "instruction": {
              "address": "20519090",
              "bytes": "6894686520",
              "assembly": "PUSH 0x20656894"
            }
          },
          "nameLiteralUses": [
            {
              "address": "20656894",
              "bytes": "4c6173745370656c6c00",
              "instruction": {
                "address": "20519090",
                "bytes": "6894686520",
                "assembly": "PUSH 0x20656894"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "actual bCPropertyID::CreateRandom on descriptor-resolved destination",
            "requiresService": "actual random PropertyID generator; no inferred all-zero ID",
            "source": "Game:20324780",
            "nativeOffset": 104,
            "typeName": "bCPropertyID"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "BookOfFlood",
          "nativeOffset": 132,
          "typeName": "long",
          "registrar": "Game:20519160",
          "reader": "Game:203237d0",
          "defaultInitializer": "Game:20323580",
          "addressGetter": "Game:20323360",
          "descriptor": "207c181c",
          "vtable": "2069802c",
          "descriptorStore": {
            "address": "205191a9",
            "bytes": "c7051c187c202c806920",
            "assembly": "MOV dword ptr [0x207c181c],0x2069802c"
          },
          "offsetStore": {
            "address": "205191c2",
            "bytes": "c70538187c2084000000",
            "assembly": "MOV dword ptr [0x207c1838],0x84"
          },
          "defaultStore": {
            "address": "205191cc",
            "bytes": "c7053c187c2000000000",
            "assembly": "MOV dword ptr [0x207c183c],0x0"
          },
          "nameLiteral": {
            "address": "2065dc4c",
            "bytes": "426f6f6b4f66466c6f6f6400",
            "instruction": {
              "address": "20519180",
              "bytes": "684cdc6520",
              "assembly": "PUSH 0x2065dc4c"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dc4c",
              "bytes": "426f6f6b4f66466c6f6f6400",
              "instruction": {
                "address": "20519180",
                "bytes": "684cdc6520",
                "assembly": "PUSH 0x2065dc4c"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20323580",
            "nativeOffset": 132,
            "typeName": "long"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "BookOfRhobar",
          "nativeOffset": 136,
          "typeName": "long",
          "registrar": "Game:20519250",
          "reader": "Game:203237d0",
          "defaultInitializer": "Game:20323580",
          "addressGetter": "Game:20323360",
          "descriptor": "207c1840",
          "vtable": "2069802c",
          "descriptorStore": {
            "address": "20519299",
            "bytes": "c70540187c202c806920",
            "assembly": "MOV dword ptr [0x207c1840],0x2069802c"
          },
          "offsetStore": {
            "address": "205192b2",
            "bytes": "c7055c187c2088000000",
            "assembly": "MOV dword ptr [0x207c185c],0x88"
          },
          "defaultStore": {
            "address": "205192bc",
            "bytes": "c70560187c2000000000",
            "assembly": "MOV dword ptr [0x207c1860],0x0"
          },
          "nameLiteral": {
            "address": "2065dc5c",
            "bytes": "426f6f6b4f6652686f62617200",
            "instruction": {
              "address": "20519270",
              "bytes": "685cdc6520",
              "assembly": "PUSH 0x2065dc5c"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dc5c",
              "bytes": "426f6f6b4f6652686f62617200",
              "instruction": {
                "address": "20519270",
                "bytes": "685cdc6520",
                "assembly": "PUSH 0x2065dc5c"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20323580",
            "nativeOffset": 136,
            "typeName": "long"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "BookOfZuben",
          "nativeOffset": 140,
          "typeName": "long",
          "registrar": "Game:20519340",
          "reader": "Game:203237d0",
          "defaultInitializer": "Game:20323580",
          "addressGetter": "Game:20323360",
          "descriptor": "207c1864",
          "vtable": "2069802c",
          "descriptorStore": {
            "address": "20519389",
            "bytes": "c70564187c202c806920",
            "assembly": "MOV dword ptr [0x207c1864],0x2069802c"
          },
          "offsetStore": {
            "address": "205193a2",
            "bytes": "c70580187c208c000000",
            "assembly": "MOV dword ptr [0x207c1880],0x8c"
          },
          "defaultStore": {
            "address": "205193ac",
            "bytes": "c70584187c2000000000",
            "assembly": "MOV dword ptr [0x207c1884],0x0"
          },
          "nameLiteral": {
            "address": "2065dc6c",
            "bytes": "426f6f6b4f665a7562656e00",
            "instruction": {
              "address": "20519360",
              "bytes": "686cdc6520",
              "assembly": "PUSH 0x2065dc6c"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dc6c",
              "bytes": "426f6f6b4f665a7562656e00",
              "instruction": {
                "address": "20519360",
                "bytes": "686cdc6520",
                "assembly": "PUSH 0x2065dc6c"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20323580",
            "nativeOffset": 140,
            "typeName": "long"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "DuskToDawnStartHour",
          "nativeOffset": 144,
          "typeName": "long",
          "registrar": "Game:20519430",
          "reader": "Game:203237d0",
          "defaultInitializer": "Game:20323580",
          "addressGetter": "Game:20323360",
          "descriptor": "207c1888",
          "vtable": "2069802c",
          "descriptorStore": {
            "address": "20519479",
            "bytes": "c70588187c202c806920",
            "assembly": "MOV dword ptr [0x207c1888],0x2069802c"
          },
          "offsetStore": {
            "address": "20519492",
            "bytes": "c705a4187c2090000000",
            "assembly": "MOV dword ptr [0x207c18a4],0x90"
          },
          "defaultStore": {
            "address": "2051949c",
            "bytes": "c705a8187c2000000000",
            "assembly": "MOV dword ptr [0x207c18a8],0x0"
          },
          "nameLiteral": {
            "address": "2065dc7c",
            "bytes": "4475736b546f4461776e5374617274486f757200",
            "instruction": {
              "address": "20519450",
              "bytes": "687cdc6520",
              "assembly": "PUSH 0x2065dc7c"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dc7c",
              "bytes": "4475736b546f4461776e5374617274486f757200",
              "instruction": {
                "address": "20519450",
                "bytes": "687cdc6520",
                "assembly": "PUSH 0x2065dc7c"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20323580",
            "nativeOffset": 144,
            "typeName": "long"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "Chapter",
          "nativeOffset": 148,
          "typeName": "long",
          "registrar": "Game:20519520",
          "reader": "Game:203237d0",
          "defaultInitializer": "Game:20323580",
          "addressGetter": "Game:20323360",
          "descriptor": "207c18ac",
          "vtable": "2069802c",
          "descriptorStore": {
            "address": "20519569",
            "bytes": "c705ac187c202c806920",
            "assembly": "MOV dword ptr [0x207c18ac],0x2069802c"
          },
          "offsetStore": {
            "address": "20519582",
            "bytes": "c705c8187c2094000000",
            "assembly": "MOV dword ptr [0x207c18c8],0x94"
          },
          "defaultStore": {
            "address": "2051958c",
            "bytes": "c705cc187c2000000000",
            "assembly": "MOV dword ptr [0x207c18cc],0x0"
          },
          "nameLiteral": {
            "address": "2065dc94",
            "bytes": "4368617074657200",
            "instruction": {
              "address": "20519540",
              "bytes": "6894dc6520",
              "assembly": "PUSH 0x2065dc94"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dc94",
              "bytes": "4368617074657200",
              "instruction": {
                "address": "20519540",
                "bytes": "6894dc6520",
                "assembly": "PUSH 0x2065dc94"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20323580",
            "nativeOffset": 148,
            "typeName": "long"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "TutorialFlags",
          "nativeOffset": 152,
          "typeName": "long",
          "registrar": "Game:20519610",
          "reader": "Game:20325b20",
          "defaultInitializer": "Game:203258d0",
          "addressGetter": "Game:203256b0",
          "descriptor": "207c18d0",
          "vtable": "2069824c",
          "descriptorStore": {
            "address": "20519659",
            "bytes": "c705d0187c204c826920",
            "assembly": "MOV dword ptr [0x207c18d0],0x2069824c"
          },
          "offsetStore": {
            "address": "20519672",
            "bytes": "c705ec187c2098000000",
            "assembly": "MOV dword ptr [0x207c18ec],0x98"
          },
          "defaultStore": {
            "address": "2051967c",
            "bytes": "c705f0187c2000000000",
            "assembly": "MOV dword ptr [0x207c18f0],0x0"
          },
          "nameLiteral": {
            "address": "2065dca0",
            "bytes": "5475746f7269616c466c61677300",
            "instruction": {
              "address": "20519630",
              "bytes": "68a0dc6520",
              "assembly": "PUSH 0x2065dca0"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dca0",
              "bytes": "5475746f7269616c466c61677300",
              "instruction": {
                "address": "20519630",
                "bytes": "68a0dc6520",
                "assembly": "PUSH 0x2065dca0"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:203258d0",
            "nativeOffset": 152,
            "typeName": "long"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "TalkedToDiego",
          "nativeOffset": 156,
          "typeName": "bool",
          "registrar": "Game:20519700",
          "reader": "Game:203221c0",
          "defaultInitializer": "Game:20321f70",
          "addressGetter": "Game:20321d50",
          "descriptor": "207c18f4",
          "vtable": "20697e0c",
          "descriptorStore": {
            "address": "20519749",
            "bytes": "c705f4187c200c7e6920",
            "assembly": "MOV dword ptr [0x207c18f4],0x20697e0c"
          },
          "offsetStore": {
            "address": "20519762",
            "bytes": "c70510197c209c000000",
            "assembly": "MOV dword ptr [0x207c1910],0x9c"
          },
          "defaultStore": {
            "address": "2051976c",
            "bytes": "c70514197c2000000000",
            "assembly": "MOV dword ptr [0x207c1914],0x0"
          },
          "nameLiteral": {
            "address": "2065dcb0",
            "bytes": "54616c6b6564546f446965676f00",
            "instruction": {
              "address": "20519720",
              "bytes": "68b0dc6520",
              "assembly": "PUSH 0x2065dcb0"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dcb0",
              "bytes": "54616c6b6564546f446965676f00",
              "instruction": {
                "address": "20519720",
                "bytes": "68b0dc6520",
                "assembly": "PUSH 0x2065dcb0"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero byte at actual descriptor-resolved destination",
            "value": false,
            "bytes": "00",
            "source": "Game:20321f70",
            "nativeOffset": 156,
            "typeName": "bool"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "TalkedToGorn",
          "nativeOffset": 157,
          "typeName": "bool",
          "registrar": "Game:205197f0",
          "reader": "Game:203221c0",
          "defaultInitializer": "Game:20321f70",
          "addressGetter": "Game:20321d50",
          "descriptor": "207c1918",
          "vtable": "20697e0c",
          "descriptorStore": {
            "address": "20519839",
            "bytes": "c70518197c200c7e6920",
            "assembly": "MOV dword ptr [0x207c1918],0x20697e0c"
          },
          "offsetStore": {
            "address": "20519852",
            "bytes": "c70534197c209d000000",
            "assembly": "MOV dword ptr [0x207c1934],0x9d"
          },
          "defaultStore": {
            "address": "2051985c",
            "bytes": "c70538197c2000000000",
            "assembly": "MOV dword ptr [0x207c1938],0x0"
          },
          "nameLiteral": {
            "address": "2065dcc0",
            "bytes": "54616c6b6564546f476f726e00",
            "instruction": {
              "address": "20519810",
              "bytes": "68c0dc6520",
              "assembly": "PUSH 0x2065dcc0"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dcc0",
              "bytes": "54616c6b6564546f476f726e00",
              "instruction": {
                "address": "20519810",
                "bytes": "68c0dc6520",
                "assembly": "PUSH 0x2065dcc0"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero byte at actual descriptor-resolved destination",
            "value": false,
            "bytes": "00",
            "source": "Game:20321f70",
            "nativeOffset": 157,
            "typeName": "bool"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "TalkedToMilten",
          "nativeOffset": 158,
          "typeName": "bool",
          "registrar": "Game:205198e0",
          "reader": "Game:203221c0",
          "defaultInitializer": "Game:20321f70",
          "addressGetter": "Game:20321d50",
          "descriptor": "207c193c",
          "vtable": "20697e0c",
          "descriptorStore": {
            "address": "20519929",
            "bytes": "c7053c197c200c7e6920",
            "assembly": "MOV dword ptr [0x207c193c],0x20697e0c"
          },
          "offsetStore": {
            "address": "20519942",
            "bytes": "c70558197c209e000000",
            "assembly": "MOV dword ptr [0x207c1958],0x9e"
          },
          "defaultStore": {
            "address": "2051994c",
            "bytes": "c7055c197c2000000000",
            "assembly": "MOV dword ptr [0x207c195c],0x0"
          },
          "nameLiteral": {
            "address": "2065dcd0",
            "bytes": "54616c6b6564546f4d696c74656e00",
            "instruction": {
              "address": "20519900",
              "bytes": "68d0dc6520",
              "assembly": "PUSH 0x2065dcd0"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dcd0",
              "bytes": "54616c6b6564546f4d696c74656e00",
              "instruction": {
                "address": "20519900",
                "bytes": "68d0dc6520",
                "assembly": "PUSH 0x2065dcd0"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero byte at actual descriptor-resolved destination",
            "value": false,
            "bytes": "00",
            "source": "Game:20321f70",
            "nativeOffset": 158,
            "typeName": "bool"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "TalkedToLester",
          "nativeOffset": 159,
          "typeName": "bool",
          "registrar": "Game:205199d0",
          "reader": "Game:203221c0",
          "defaultInitializer": "Game:20321f70",
          "addressGetter": "Game:20321d50",
          "descriptor": "207c1960",
          "vtable": "20697e0c",
          "descriptorStore": {
            "address": "20519a19",
            "bytes": "c70560197c200c7e6920",
            "assembly": "MOV dword ptr [0x207c1960],0x20697e0c"
          },
          "offsetStore": {
            "address": "20519a32",
            "bytes": "c7057c197c209f000000",
            "assembly": "MOV dword ptr [0x207c197c],0x9f"
          },
          "defaultStore": {
            "address": "20519a3c",
            "bytes": "c70580197c2000000000",
            "assembly": "MOV dword ptr [0x207c1980],0x0"
          },
          "nameLiteral": {
            "address": "2065dce4",
            "bytes": "54616c6b6564546f4c657374657200",
            "instruction": {
              "address": "205199f0",
              "bytes": "68e4dc6520",
              "assembly": "PUSH 0x2065dce4"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dce4",
              "bytes": "54616c6b6564546f4c657374657200",
              "instruction": {
                "address": "205199f0",
                "bytes": "68e4dc6520",
                "assembly": "PUSH 0x2065dce4"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero byte at actual descriptor-resolved destination",
            "value": false,
            "bytes": "00",
            "source": "Game:20321f70",
            "nativeOffset": 159,
            "typeName": "bool"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "TimeStampStart",
          "nativeOffset": 160,
          "typeName": "float",
          "registrar": "Game:20519ac0",
          "reader": "Game:20325290",
          "defaultInitializer": "Game:20325030",
          "addressGetter": "Game:20324e10",
          "descriptor": "207c1984",
          "vtable": "206981c4",
          "descriptorStore": {
            "address": "20519b09",
            "bytes": "c70584197c20c4816920",
            "assembly": "MOV dword ptr [0x207c1984],0x206981c4"
          },
          "offsetStore": {
            "address": "20519b22",
            "bytes": "c705a0197c20a0000000",
            "assembly": "MOV dword ptr [0x207c19a0],0xa0"
          },
          "defaultStore": {
            "address": "20519b2c",
            "bytes": "c705a4197c2000000000",
            "assembly": "MOV dword ptr [0x207c19a4],0x0"
          },
          "nameLiteral": {
            "address": "2065dcf8",
            "bytes": "54696d655374616d70537461727400",
            "instruction": {
              "address": "20519ae0",
              "bytes": "68f8dc6520",
              "assembly": "PUSH 0x2065dcf8"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dcf8",
              "bytes": "54696d655374616d70537461727400",
              "instruction": {
                "address": "20519ae0",
                "bytes": "68f8dc6520",
                "assembly": "PUSH 0x2065dcf8"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero DWORD at actual descriptor-resolved destination",
            "value": 0,
            "bytes": "00000000",
            "source": "Game:20325030",
            "nativeOffset": 160,
            "typeName": "float"
          }
        },
        {
          "className": "gCPlayerMemory_PS",
          "name": "IsConsumingItem",
          "nativeOffset": 164,
          "typeName": "bool",
          "registrar": "Game:20519bb0",
          "reader": "Game:203221c0",
          "defaultInitializer": "Game:20321f70",
          "addressGetter": "Game:20321d50",
          "descriptor": "207c19a8",
          "vtable": "20697e0c",
          "descriptorStore": {
            "address": "20519bf9",
            "bytes": "c705a8197c200c7e6920",
            "assembly": "MOV dword ptr [0x207c19a8],0x20697e0c"
          },
          "offsetStore": {
            "address": "20519c12",
            "bytes": "c705c4197c20a4000000",
            "assembly": "MOV dword ptr [0x207c19c4],0xa4"
          },
          "defaultStore": {
            "address": "20519c1c",
            "bytes": "c705c8197c2000000000",
            "assembly": "MOV dword ptr [0x207c19c8],0x0"
          },
          "nameLiteral": {
            "address": "2065dd0c",
            "bytes": "4973436f6e73756d696e674974656d00",
            "instruction": {
              "address": "20519bd0",
              "bytes": "680cdd6520",
              "assembly": "PUSH 0x2065dd0c"
            }
          },
          "nameLiteralUses": [
            {
              "address": "2065dd0c",
              "bytes": "4973436f6e73756d696e674974656d00",
              "instruction": {
                "address": "20519bd0",
                "bytes": "680cdd6520",
                "assembly": "PUSH 0x2065dd0c"
              }
            }
          ],
          "defaultBehavior": {
            "behavior": "write zero byte at actual descriptor-resolved destination",
            "value": false,
            "bytes": "00",
            "source": "Game:20321f70",
            "nativeOffset": 164,
            "typeName": "bool"
          }
        }
      ],
      "heroSerialized": {
        "className": "gCPlayerMemory_PS",
        "outerVersion": 5,
        "nativeReadVersion": 5,
        "objectVersion": 83,
        "propertyVersion": 30,
        "sourceOffset": 1189475,
        "endSourceOffset": 1191088,
        "serializedRaw": "0500010001010001830d01000053005300380600001e0018000000840d10001e000100000000850d8b001e00050000000100000000860d9f001e00290000000109000000000000000000000000000000000000000000000000000000000000000000000000000000870d9f001e00290000000109000000000000000000000000000000000000000000000000000000000000000000000000000000880d9f001e00290000000109000000000000000000000000000000000000000000000000000000000000000000000000000000890d8a0d1e000e00000001090000000000000000000000008b0d1c001e0004000000000000008c0d1c001e0004000000000000008d0d1c001e0004000000000000008e0d0c001e0004000000000000008f0d0c001e000400000000000000900d910d1e00060000000100000000001c0cba0b1e0014000000e3f3194ca998c64faeaf3e865599e60c00000000920d1c001e000400000000000000930d1c001e000400000000000000940d1c001e000400000000000000950d1c001e000400000000000000960d1c001e000400000000000000970d1c001e000400000000000000980d10001e000100000000990d10001e0001000000009a0d10001e0001000000009b0d10001e0001000000009c0d0c001e00040000000000000005000f000000a5020100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a5029f0d27001e000400000000000000a00d27001e0004000000640000000100a50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a50c9f0d27001e000400000000000000a00d27001e00040000006400000001009d020100010100019d0d01000053005300300000001e00030000009e0d51001e00020000009d029f0d27001e000400000000000000a00d27001e0004000000640000000100c409010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000c4099f0d27001e000400000000000000a00d27001e000400000064000000010077010100010100019d0d01000053005300300000001e00030000009e0d51001e000200000077019f0d27001e000400000000000000a00d27001e0004000000640000000100ec000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000ec009f0d27001e000400000000000000a00d27001e0004000000640000000100b60c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b60c9f0d27001e000400000000000000a00d27001e0004000000640000000100d2000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000d2009f0d27001e000400000000000000a00d27001e0004000000640000000100fb09010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000fb099f0d27001e000400000000000000a00d27001e000400000064000000010041040100010100019d0d01000053005300300000001e00030000009e0d51001e000200000041049f0d27001e000400000000000000a00d27001e0004000000640000000100b40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b40c9f0d27001e000400000000000000a00d27001e0004000000640000000100a40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a40c9f0d27001e000400000000000000a00d27001e0004000000640000000100b50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b50c9f0d27001e000400000000000000a00d27001e0004000000640000000100490a010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000490a9f0d27001e000400000000000000a00d27001e0004000000640000000100b70c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b70c9f0d27001e000400000000000000a00d27001e0004000000640000000100dec0adde",
        "serializedSha256": "a87767e871bf6a1b83e91c58c13350db5b353bbedc0d440bc02b618b2b508135",
        "properties": [
          {
            "name": "HideTips",
            "type": "bool",
            "raw": "00",
            "value": null,
            "offset": 1189512,
            "sourceOffset": 1189512,
            "recordOffset": 1189502,
            "recordSourceOffset": 1189502,
            "nameStringIndex": 3460,
            "typeStringIndex": 16,
            "magic": 30,
            "byteLength": 1,
            "inlineStrings": false,
            "recordHeaderRaw": "840d10001e0001000000"
          },
          {
            "name": "PlayerKnows",
            "type": "bTObjArray<class bCString>",
            "raw": "0100000000",
            "value": null,
            "offset": 1189523,
            "sourceOffset": 1189523,
            "recordOffset": 1189513,
            "recordSourceOffset": 1189513,
            "nameStringIndex": 3461,
            "typeStringIndex": 139,
            "magic": 30,
            "byteLength": 5,
            "inlineStrings": false,
            "recordHeaderRaw": "850d8b001e0005000000"
          },
          {
            "name": "PoliticalFame",
            "type": "bTValArray<long>",
            "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "value": null,
            "offset": 1189538,
            "sourceOffset": 1189538,
            "recordOffset": 1189528,
            "recordSourceOffset": 1189528,
            "nameStringIndex": 3462,
            "typeStringIndex": 159,
            "magic": 30,
            "byteLength": 41,
            "inlineStrings": false,
            "recordHeaderRaw": "860d9f001e0029000000"
          },
          {
            "name": "PoliticalSuspectComment",
            "type": "bTValArray<long>",
            "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "value": null,
            "offset": 1189589,
            "sourceOffset": 1189589,
            "recordOffset": 1189579,
            "recordSourceOffset": 1189579,
            "nameStringIndex": 3463,
            "typeStringIndex": 159,
            "magic": 30,
            "byteLength": 41,
            "inlineStrings": false,
            "recordHeaderRaw": "870d9f001e0029000000"
          },
          {
            "name": "PoliticalCrimeCount",
            "type": "bTValArray<long>",
            "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "value": null,
            "offset": 1189640,
            "sourceOffset": 1189640,
            "recordOffset": 1189630,
            "recordSourceOffset": 1189630,
            "nameStringIndex": 3464,
            "typeStringIndex": 159,
            "magic": 30,
            "byteLength": 41,
            "inlineStrings": false,
            "recordHeaderRaw": "880d9f001e0029000000"
          },
          {
            "name": "PoliticalPlayerCrime",
            "type": "bTValArray<bool>",
            "raw": "0109000000000000000000000000",
            "value": null,
            "offset": 1189691,
            "sourceOffset": 1189691,
            "recordOffset": 1189681,
            "recordSourceOffset": 1189681,
            "nameStringIndex": 3465,
            "typeStringIndex": 3466,
            "magic": 30,
            "byteLength": 14,
            "inlineStrings": false,
            "recordHeaderRaw": "890d8a0d1e000e000000"
          },
          {
            "name": "XP",
            "type": "long",
            "raw": "00000000",
            "value": null,
            "offset": 1189715,
            "sourceOffset": 1189715,
            "recordOffset": 1189705,
            "recordSourceOffset": 1189705,
            "nameStringIndex": 3467,
            "typeStringIndex": 28,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "8b0d1c001e0004000000"
          },
          {
            "name": "LPAttribs",
            "type": "long",
            "raw": "00000000",
            "value": null,
            "offset": 1189729,
            "sourceOffset": 1189729,
            "recordOffset": 1189719,
            "recordSourceOffset": 1189719,
            "nameStringIndex": 3468,
            "typeStringIndex": 28,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "8c0d1c001e0004000000"
          },
          {
            "name": "LPPerks",
            "type": "long",
            "raw": "00000000",
            "value": null,
            "offset": 1189743,
            "sourceOffset": 1189743,
            "recordOffset": 1189733,
            "recordSourceOffset": 1189733,
            "nameStringIndex": 3469,
            "typeStringIndex": 28,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "8d0d1c001e0004000000"
          },
          {
            "name": "SecondsTransformRemain",
            "type": "float",
            "raw": "00000000",
            "value": null,
            "offset": 1189757,
            "sourceOffset": 1189757,
            "recordOffset": 1189747,
            "recordSourceOffset": 1189747,
            "nameStringIndex": 3470,
            "typeStringIndex": 12,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "8e0d0c001e0004000000"
          },
          {
            "name": "SecondsMistRemain",
            "type": "float",
            "raw": "00000000",
            "value": null,
            "offset": 1189771,
            "sourceOffset": 1189771,
            "recordOffset": 1189761,
            "recordSourceOffset": 1189761,
            "nameStringIndex": 3471,
            "typeStringIndex": 12,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "8f0d0c001e0004000000"
          },
          {
            "name": "LastWeaponConfig",
            "type": "bTPropertyContainer<enum gEWeaponConfig>",
            "raw": "010000000000",
            "value": null,
            "offset": 1189785,
            "sourceOffset": 1189785,
            "recordOffset": 1189775,
            "recordSourceOffset": 1189775,
            "nameStringIndex": 3472,
            "typeStringIndex": 3473,
            "magic": 30,
            "byteLength": 6,
            "inlineStrings": false,
            "recordHeaderRaw": "900d910d1e0006000000"
          },
          {
            "name": "LastSpell",
            "type": "bCPropertyID",
            "raw": "e3f3194ca998c64faeaf3e865599e60c00000000",
            "value": null,
            "offset": 1189801,
            "sourceOffset": 1189801,
            "recordOffset": 1189791,
            "recordSourceOffset": 1189791,
            "nameStringIndex": 3100,
            "typeStringIndex": 3002,
            "magic": 30,
            "byteLength": 20,
            "inlineStrings": false,
            "recordHeaderRaw": "1c0cba0b1e0014000000"
          },
          {
            "name": "BookOfFlood",
            "type": "long",
            "raw": "00000000",
            "value": null,
            "offset": 1189831,
            "sourceOffset": 1189831,
            "recordOffset": 1189821,
            "recordSourceOffset": 1189821,
            "nameStringIndex": 3474,
            "typeStringIndex": 28,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "920d1c001e0004000000"
          },
          {
            "name": "BookOfRhobar",
            "type": "long",
            "raw": "00000000",
            "value": null,
            "offset": 1189845,
            "sourceOffset": 1189845,
            "recordOffset": 1189835,
            "recordSourceOffset": 1189835,
            "nameStringIndex": 3475,
            "typeStringIndex": 28,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "930d1c001e0004000000"
          },
          {
            "name": "BookOfZuben",
            "type": "long",
            "raw": "00000000",
            "value": null,
            "offset": 1189859,
            "sourceOffset": 1189859,
            "recordOffset": 1189849,
            "recordSourceOffset": 1189849,
            "nameStringIndex": 3476,
            "typeStringIndex": 28,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "940d1c001e0004000000"
          },
          {
            "name": "DuskToDawnStartHour",
            "type": "long",
            "raw": "00000000",
            "value": null,
            "offset": 1189873,
            "sourceOffset": 1189873,
            "recordOffset": 1189863,
            "recordSourceOffset": 1189863,
            "nameStringIndex": 3477,
            "typeStringIndex": 28,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "950d1c001e0004000000"
          },
          {
            "name": "Chapter",
            "type": "long",
            "raw": "00000000",
            "value": null,
            "offset": 1189887,
            "sourceOffset": 1189887,
            "recordOffset": 1189877,
            "recordSourceOffset": 1189877,
            "nameStringIndex": 3478,
            "typeStringIndex": 28,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "960d1c001e0004000000"
          },
          {
            "name": "TutorialFlags",
            "type": "long",
            "raw": "00000000",
            "value": null,
            "offset": 1189901,
            "sourceOffset": 1189901,
            "recordOffset": 1189891,
            "recordSourceOffset": 1189891,
            "nameStringIndex": 3479,
            "typeStringIndex": 28,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "970d1c001e0004000000"
          },
          {
            "name": "TalkedToDiego",
            "type": "bool",
            "raw": "00",
            "value": null,
            "offset": 1189915,
            "sourceOffset": 1189915,
            "recordOffset": 1189905,
            "recordSourceOffset": 1189905,
            "nameStringIndex": 3480,
            "typeStringIndex": 16,
            "magic": 30,
            "byteLength": 1,
            "inlineStrings": false,
            "recordHeaderRaw": "980d10001e0001000000"
          },
          {
            "name": "TalkedToGorn",
            "type": "bool",
            "raw": "00",
            "value": null,
            "offset": 1189926,
            "sourceOffset": 1189926,
            "recordOffset": 1189916,
            "recordSourceOffset": 1189916,
            "nameStringIndex": 3481,
            "typeStringIndex": 16,
            "magic": 30,
            "byteLength": 1,
            "inlineStrings": false,
            "recordHeaderRaw": "990d10001e0001000000"
          },
          {
            "name": "TalkedToMilten",
            "type": "bool",
            "raw": "00",
            "value": null,
            "offset": 1189937,
            "sourceOffset": 1189937,
            "recordOffset": 1189927,
            "recordSourceOffset": 1189927,
            "nameStringIndex": 3482,
            "typeStringIndex": 16,
            "magic": 30,
            "byteLength": 1,
            "inlineStrings": false,
            "recordHeaderRaw": "9a0d10001e0001000000"
          },
          {
            "name": "TalkedToLester",
            "type": "bool",
            "raw": "00",
            "value": null,
            "offset": 1189948,
            "sourceOffset": 1189948,
            "recordOffset": 1189938,
            "recordSourceOffset": 1189938,
            "nameStringIndex": 3483,
            "typeStringIndex": 16,
            "magic": 30,
            "byteLength": 1,
            "inlineStrings": false,
            "recordHeaderRaw": "9b0d10001e0001000000"
          },
          {
            "name": "TimeStampStart",
            "type": "float",
            "raw": "00000000",
            "value": null,
            "offset": 1189959,
            "sourceOffset": 1189959,
            "recordOffset": 1189949,
            "recordSourceOffset": 1189949,
            "nameStringIndex": 3484,
            "typeStringIndex": 12,
            "magic": 30,
            "byteLength": 4,
            "inlineStrings": false,
            "recordHeaderRaw": "9c0d0c001e0004000000"
          }
        ],
        "tailRaw": "0f000000a5020100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a5029f0d27001e000400000000000000a00d27001e0004000000640000000100a50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a50c9f0d27001e000400000000000000a00d27001e00040000006400000001009d020100010100019d0d01000053005300300000001e00030000009e0d51001e00020000009d029f0d27001e000400000000000000a00d27001e0004000000640000000100c409010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000c4099f0d27001e000400000000000000a00d27001e000400000064000000010077010100010100019d0d01000053005300300000001e00030000009e0d51001e000200000077019f0d27001e000400000000000000a00d27001e0004000000640000000100ec000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000ec009f0d27001e000400000000000000a00d27001e0004000000640000000100b60c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b60c9f0d27001e000400000000000000a00d27001e0004000000640000000100d2000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000d2009f0d27001e000400000000000000a00d27001e0004000000640000000100fb09010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000fb099f0d27001e000400000000000000a00d27001e000400000064000000010041040100010100019d0d01000053005300300000001e00030000009e0d51001e000200000041049f0d27001e000400000000000000a00d27001e0004000000640000000100b40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b40c9f0d27001e000400000000000000a00d27001e0004000000640000000100a40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a40c9f0d27001e000400000000000000a00d27001e0004000000640000000100b50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b50c9f0d27001e000400000000000000a00d27001e0004000000640000000100490a010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000490a9f0d27001e000400000000000000a00d27001e0004000000640000000100b70c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b70c9f0d27001e000400000000000000a00d27001e0004000000640000000100",
        "nativeReadOffset": 1189963,
        "worldResident": false
      },
      "GetVersion": "Game:2031d400",
      "CreateStat": "Game:2031dd70",
      "ReadAttributes": "Game:2031e700",
      "ReadSaveGame": "Game:2031ead0",
      "OnPostRead": "Game:2031d510",
      "Read": "Game:2031ea60",
      "ReadAttributesV4": "Game:2031e650",
      "ReadAttributesV3": "Game:2031e920",
      "CreateAttributes": "Game:2031e140",
      "PostInitializeProperties": "Game:2031e3c0",
      "Create": "Game:2031d4a0",
      "CreateAttrib": "Game:2031db70",
      "Invalidate": "Game:2031d3f0",
      "DestroyAttributes": "Game:2031e5d0",
      "GetPropertySetType": "Game:2031d410",
      "wrapperBytes": 16,
      "wrapperAllocationTag": 400,
      "map": {
        "constructor": "Game:20327550",
        "nativeOffset": 168,
        "headerBytes": 16,
        "bucketCount": 43,
        "freshCapacity": 51,
        "nodeBytes": 12,
        "nodeAllocationTag": 409,
        "nodeLayout": {
          "keyCString": 0,
          "nativeAttributePointer": 4,
          "next": 8
        },
        "freshCapacityDerivation": "43 requested plus minimum growth8 at old capacity0; source203205f0"
      }
    }
  },
  "fields": [
    {
      "className": "gCPlayerMemory_PS",
      "name": "HideTips",
      "nativeOffset": 20,
      "typeName": "bool",
      "registrar": "Game:20518530",
      "reader": "Game:203221c0",
      "defaultInitializer": "Game:20321f70",
      "addressGetter": "Game:20321d50",
      "descriptor": "207c1648",
      "vtable": "20697e0c",
      "descriptorStore": {
        "address": "20518579",
        "bytes": "c70548167c200c7e6920",
        "assembly": "MOV dword ptr [0x207c1648],0x20697e0c"
      },
      "offsetStore": {
        "address": "20518592",
        "bytes": "c70564167c2014000000",
        "assembly": "MOV dword ptr [0x207c1664],0x14"
      },
      "defaultStore": {
        "address": "2051859c",
        "bytes": "c70568167c2000000000",
        "assembly": "MOV dword ptr [0x207c1668],0x0"
      },
      "nameLiteral": {
        "address": "2065dbf0",
        "bytes": "486964655469707300",
        "instruction": {
          "address": "20518550",
          "bytes": "68f0db6520",
          "assembly": "PUSH 0x2065dbf0"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dbf0",
          "bytes": "486964655469707300",
          "instruction": {
            "address": "20518550",
            "bytes": "68f0db6520",
            "assembly": "PUSH 0x2065dbf0"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero byte at actual descriptor-resolved destination",
        "value": false,
        "bytes": "00",
        "source": "Game:20321f70",
        "nativeOffset": 20,
        "typeName": "bool"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "PlayerKnows",
      "nativeOffset": 24,
      "typeName": "bTObjArray<class bCString>",
      "registrar": "Game:20518620",
      "reader": "Game:20327040",
      "defaultInitializer": "Game:20322670",
      "addressGetter": "Game:20322450",
      "descriptor": "207c166c",
      "vtable": "20697e94",
      "descriptorStore": {
        "address": "20518669",
        "bytes": "c7056c167c20947e6920",
        "assembly": "MOV dword ptr [0x207c166c],0x20697e94"
      },
      "offsetStore": {
        "address": "20518682",
        "bytes": "c70588167c2018000000",
        "assembly": "MOV dword ptr [0x207c1688],0x18"
      },
      "defaultStore": {
        "address": "2051868c",
        "bytes": "c7058c167c2000000000",
        "assembly": "MOV dword ptr [0x207c168c],0x0"
      },
      "nameLiteral": {
        "address": "2065e2bc",
        "bytes": "506c617965724b6e6f777300",
        "instruction": {
          "address": "20518640",
          "bytes": "68bce26520",
          "assembly": "PUSH 0x2065e2bc"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065e2bc",
          "bytes": "506c617965724b6e6f777300",
          "instruction": {
            "address": "20518640",
            "bytes": "68bce26520",
            "assembly": "PUSH 0x2065e2bc"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
        "payloadWritten": false,
        "freshEmptyHeaderFromConstructor": true,
        "source": "Game:20322670",
        "nativeOffset": 24,
        "typeName": "bTObjArray<class bCString>"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "PoliticalFame",
      "nativeOffset": 36,
      "typeName": "bTValArray<long>",
      "registrar": "Game:20518710",
      "reader": "Game:20326cb0",
      "defaultInitializer": "Game:20322ac0",
      "addressGetter": "Game:203228a0",
      "descriptor": "207c1690",
      "vtable": "20697f1c",
      "descriptorStore": {
        "address": "20518759",
        "bytes": "c70590167c201c7f6920",
        "assembly": "MOV dword ptr [0x207c1690],0x20697f1c"
      },
      "offsetStore": {
        "address": "20518772",
        "bytes": "c705ac167c2024000000",
        "assembly": "MOV dword ptr [0x207c16ac],0x24"
      },
      "defaultStore": {
        "address": "2051877c",
        "bytes": "c705b0167c2000000000",
        "assembly": "MOV dword ptr [0x207c16b0],0x0"
      },
      "nameLiteral": {
        "address": "2065e2cc",
        "bytes": "506f6c69746963616c46616d6500",
        "instruction": {
          "address": "20518730",
          "bytes": "68cce26520",
          "assembly": "PUSH 0x2065e2cc"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065e2cc",
          "bytes": "506f6c69746963616c46616d6500",
          "instruction": {
            "address": "20518730",
            "bytes": "68cce26520",
            "assembly": "PUSH 0x2065e2cc"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
        "payloadWritten": false,
        "freshEmptyHeaderFromConstructor": true,
        "source": "Game:20322ac0",
        "nativeOffset": 36,
        "typeName": "bTValArray<long>"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "PoliticalSuspectComment",
      "nativeOffset": 48,
      "typeName": "bTValArray<long>",
      "registrar": "Game:20518800",
      "reader": "Game:20326cb0",
      "defaultInitializer": "Game:20322ac0",
      "addressGetter": "Game:203228a0",
      "descriptor": "207c16b4",
      "vtable": "20697f1c",
      "descriptorStore": {
        "address": "20518849",
        "bytes": "c705b4167c201c7f6920",
        "assembly": "MOV dword ptr [0x207c16b4],0x20697f1c"
      },
      "offsetStore": {
        "address": "20518862",
        "bytes": "c705d0167c2030000000",
        "assembly": "MOV dword ptr [0x207c16d0],0x30"
      },
      "defaultStore": {
        "address": "2051886c",
        "bytes": "c705d4167c2000000000",
        "assembly": "MOV dword ptr [0x207c16d4],0x0"
      },
      "nameLiteral": {
        "address": "2065e2dc",
        "bytes": "506f6c69746963616c53757370656374436f6d6d656e7400",
        "instruction": {
          "address": "20518820",
          "bytes": "68dce26520",
          "assembly": "PUSH 0x2065e2dc"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065e2dc",
          "bytes": "506f6c69746963616c53757370656374436f6d6d656e7400",
          "instruction": {
            "address": "20518820",
            "bytes": "68dce26520",
            "assembly": "PUSH 0x2065e2dc"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
        "payloadWritten": false,
        "freshEmptyHeaderFromConstructor": true,
        "source": "Game:20322ac0",
        "nativeOffset": 48,
        "typeName": "bTValArray<long>"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "PoliticalCrimeCount",
      "nativeOffset": 60,
      "typeName": "bTValArray<long>",
      "registrar": "Game:205188f0",
      "reader": "Game:20326cb0",
      "defaultInitializer": "Game:20322ac0",
      "addressGetter": "Game:203228a0",
      "descriptor": "207c16d8",
      "vtable": "20697f1c",
      "descriptorStore": {
        "address": "20518939",
        "bytes": "c705d8167c201c7f6920",
        "assembly": "MOV dword ptr [0x207c16d8],0x20697f1c"
      },
      "offsetStore": {
        "address": "20518952",
        "bytes": "c705f4167c203c000000",
        "assembly": "MOV dword ptr [0x207c16f4],0x3c"
      },
      "defaultStore": {
        "address": "2051895c",
        "bytes": "c705f8167c2000000000",
        "assembly": "MOV dword ptr [0x207c16f8],0x0"
      },
      "nameLiteral": {
        "address": "2065e2f8",
        "bytes": "506f6c69746963616c4372696d65436f756e7400",
        "instruction": {
          "address": "20518910",
          "bytes": "68f8e26520",
          "assembly": "PUSH 0x2065e2f8"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065e2f8",
          "bytes": "506f6c69746963616c4372696d65436f756e7400",
          "instruction": {
            "address": "20518910",
            "bytes": "68f8e26520",
            "assembly": "PUSH 0x2065e2f8"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
        "payloadWritten": false,
        "freshEmptyHeaderFromConstructor": true,
        "source": "Game:20322ac0",
        "nativeOffset": 60,
        "typeName": "bTValArray<long>"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "PoliticalPlayerCrime",
      "nativeOffset": 72,
      "typeName": "bTValArray<bool>",
      "registrar": "Game:205189e0",
      "reader": "Game:20326db0",
      "defaultInitializer": "Game:20322f50",
      "addressGetter": "Game:20322cf0",
      "descriptor": "207c16fc",
      "vtable": "20697fa4",
      "descriptorStore": {
        "address": "20518a29",
        "bytes": "c705fc167c20a47f6920",
        "assembly": "MOV dword ptr [0x207c16fc],0x20697fa4"
      },
      "offsetStore": {
        "address": "20518a42",
        "bytes": "c70518177c2048000000",
        "assembly": "MOV dword ptr [0x207c1718],0x48"
      },
      "defaultStore": {
        "address": "20518a4c",
        "bytes": "c7051c177c2000000000",
        "assembly": "MOV dword ptr [0x207c171c],0x0"
      },
      "nameLiteral": {
        "address": "2065e310",
        "bytes": "506f6c69746963616c506c617965724372696d6500",
        "instruction": {
          "address": "20518a00",
          "bytes": "6810e36520",
          "assembly": "PUSH 0x2065e310"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065e310",
          "bytes": "506f6c69746963616c506c617965724372696d6500",
          "instruction": {
            "address": "20518a00",
            "bytes": "6810e36520",
            "assembly": "PUSH 0x2065e310"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
        "payloadWritten": false,
        "freshEmptyHeaderFromConstructor": true,
        "source": "Game:20322f50",
        "nativeOffset": 72,
        "typeName": "bTValArray<bool>"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "XP",
      "nativeOffset": 84,
      "typeName": "long",
      "registrar": "Game:20518ad0",
      "reader": "Game:203237d0",
      "defaultInitializer": "Game:20323580",
      "addressGetter": "Game:20323360",
      "descriptor": "207c1720",
      "vtable": "2069802c",
      "descriptorStore": {
        "address": "20518b19",
        "bytes": "c70520177c202c806920",
        "assembly": "MOV dword ptr [0x207c1720],0x2069802c"
      },
      "offsetStore": {
        "address": "20518b32",
        "bytes": "c7053c177c2054000000",
        "assembly": "MOV dword ptr [0x207c173c],0x54"
      },
      "defaultStore": {
        "address": "20518b3c",
        "bytes": "c70540177c2000000000",
        "assembly": "MOV dword ptr [0x207c1740],0x0"
      },
      "nameLiteral": {
        "address": "2065dbfc",
        "bytes": "585000",
        "instruction": {
          "address": "20518af0",
          "bytes": "68fcdb6520",
          "assembly": "PUSH 0x2065dbfc"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dbfc",
          "bytes": "585000",
          "instruction": {
            "address": "20518af0",
            "bytes": "68fcdb6520",
            "assembly": "PUSH 0x2065dbfc"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20323580",
        "nativeOffset": 84,
        "typeName": "long"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "LPAttribs",
      "nativeOffset": 88,
      "typeName": "long",
      "registrar": "Game:20518bc0",
      "reader": "Game:203237d0",
      "defaultInitializer": "Game:20323580",
      "addressGetter": "Game:20323360",
      "descriptor": "207c1744",
      "vtable": "2069802c",
      "descriptorStore": {
        "address": "20518c09",
        "bytes": "c70544177c202c806920",
        "assembly": "MOV dword ptr [0x207c1744],0x2069802c"
      },
      "offsetStore": {
        "address": "20518c22",
        "bytes": "c70560177c2058000000",
        "assembly": "MOV dword ptr [0x207c1760],0x58"
      },
      "defaultStore": {
        "address": "20518c2c",
        "bytes": "c70564177c2000000000",
        "assembly": "MOV dword ptr [0x207c1764],0x0"
      },
      "nameLiteral": {
        "address": "2065dc00",
        "bytes": "4c504174747269627300",
        "instruction": {
          "address": "20518be0",
          "bytes": "6800dc6520",
          "assembly": "PUSH 0x2065dc00"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dc00",
          "bytes": "4c504174747269627300",
          "instruction": {
            "address": "20518be0",
            "bytes": "6800dc6520",
            "assembly": "PUSH 0x2065dc00"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20323580",
        "nativeOffset": 88,
        "typeName": "long"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "LPPerks",
      "nativeOffset": 92,
      "typeName": "long",
      "registrar": "Game:20518cb0",
      "reader": "Game:203237d0",
      "defaultInitializer": "Game:20323580",
      "addressGetter": "Game:20323360",
      "descriptor": "207c1768",
      "vtable": "2069802c",
      "descriptorStore": {
        "address": "20518cf9",
        "bytes": "c70568177c202c806920",
        "assembly": "MOV dword ptr [0x207c1768],0x2069802c"
      },
      "offsetStore": {
        "address": "20518d12",
        "bytes": "c70584177c205c000000",
        "assembly": "MOV dword ptr [0x207c1784],0x5c"
      },
      "defaultStore": {
        "address": "20518d1c",
        "bytes": "c70588177c2000000000",
        "assembly": "MOV dword ptr [0x207c1788],0x0"
      },
      "nameLiteral": {
        "address": "2065dc0c",
        "bytes": "4c505065726b7300",
        "instruction": {
          "address": "20518cd0",
          "bytes": "680cdc6520",
          "assembly": "PUSH 0x2065dc0c"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dc0c",
          "bytes": "4c505065726b7300",
          "instruction": {
            "address": "20518cd0",
            "bytes": "680cdc6520",
            "assembly": "PUSH 0x2065dc0c"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20323580",
        "nativeOffset": 92,
        "typeName": "long"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "SecondsTransformRemain",
      "nativeOffset": 124,
      "typeName": "float",
      "registrar": "Game:20518da0",
      "reader": "Game:20325290",
      "defaultInitializer": "Game:20325030",
      "addressGetter": "Game:20324e10",
      "descriptor": "207c178c",
      "vtable": "206981c4",
      "descriptorStore": {
        "address": "20518de9",
        "bytes": "c7058c177c20c4816920",
        "assembly": "MOV dword ptr [0x207c178c],0x206981c4"
      },
      "offsetStore": {
        "address": "20518e02",
        "bytes": "c705a8177c207c000000",
        "assembly": "MOV dword ptr [0x207c17a8],0x7c"
      },
      "defaultStore": {
        "address": "20518e0c",
        "bytes": "c705ac177c2000000000",
        "assembly": "MOV dword ptr [0x207c17ac],0x0"
      },
      "nameLiteral": {
        "address": "2065dc18",
        "bytes": "5365636f6e64735472616e73666f726d52656d61696e00",
        "instruction": {
          "address": "20518dc0",
          "bytes": "6818dc6520",
          "assembly": "PUSH 0x2065dc18"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dc18",
          "bytes": "5365636f6e64735472616e73666f726d52656d61696e00",
          "instruction": {
            "address": "20518dc0",
            "bytes": "6818dc6520",
            "assembly": "PUSH 0x2065dc18"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20325030",
        "nativeOffset": 124,
        "typeName": "float"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "SecondsMistRemain",
      "nativeOffset": 128,
      "typeName": "float",
      "registrar": "Game:20518e90",
      "reader": "Game:20325290",
      "defaultInitializer": "Game:20325030",
      "addressGetter": "Game:20324e10",
      "descriptor": "207c17b0",
      "vtable": "206981c4",
      "descriptorStore": {
        "address": "20518ed9",
        "bytes": "c705b0177c20c4816920",
        "assembly": "MOV dword ptr [0x207c17b0],0x206981c4"
      },
      "offsetStore": {
        "address": "20518ef2",
        "bytes": "c705cc177c2080000000",
        "assembly": "MOV dword ptr [0x207c17cc],0x80"
      },
      "defaultStore": {
        "address": "20518efc",
        "bytes": "c705d0177c2000000000",
        "assembly": "MOV dword ptr [0x207c17d0],0x0"
      },
      "nameLiteral": {
        "address": "2065dc34",
        "bytes": "5365636f6e64734d69737452656d61696e00",
        "instruction": {
          "address": "20518eb0",
          "bytes": "6834dc6520",
          "assembly": "PUSH 0x2065dc34"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dc34",
          "bytes": "5365636f6e64734d69737452656d61696e00",
          "instruction": {
            "address": "20518eb0",
            "bytes": "6834dc6520",
            "assembly": "PUSH 0x2065dc34"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20325030",
        "nativeOffset": 128,
        "typeName": "float"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "LastWeaponConfig",
      "nativeOffset": 96,
      "typeName": "bTPropertyContainer<enum gEWeaponConfig>",
      "registrar": "Game:20518f80",
      "reader": "Game:20324140",
      "defaultInitializer": "Game:20323ee0",
      "addressGetter": "Game:20323bf0",
      "descriptor": "207c17d4",
      "vtable": "206980b4",
      "descriptorStore": {
        "address": "20518fc9",
        "bytes": "c705d4177c20b4806920",
        "assembly": "MOV dword ptr [0x207c17d4],0x206980b4"
      },
      "offsetStore": {
        "address": "20518fe2",
        "bytes": "c705f0177c2060000000",
        "assembly": "MOV dword ptr [0x207c17f0],0x60"
      },
      "defaultStore": {
        "address": "20518fec",
        "bytes": "c705f4177c2000000000",
        "assembly": "MOV dword ptr [0x207c17f4],0x0"
      },
      "nameLiteral": {
        "address": "2065e23c",
        "bytes": "4c617374576561706f6e436f6e66696700",
        "instruction": {
          "address": "20518fa0",
          "bytes": "683ce26520",
          "assembly": "PUSH 0x2065e23c"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065e23c",
          "bytes": "4c617374576561706f6e436f6e66696700",
          "instruction": {
            "address": "20518fa0",
            "bytes": "683ce26520",
            "assembly": "PUSH 0x2065e23c"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "dispatch actual embedded container +0x18; 20320a30 copies mutable global207c1578",
        "liveValueKnown": false,
        "liveGlobal": "207c1578",
        "source": "Game:20323ee0",
        "nativeOffset": 96,
        "typeName": "bTPropertyContainer<enum gEWeaponConfig>"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "LastSpell",
      "nativeOffset": 104,
      "typeName": "bCPropertyID",
      "registrar": "Game:20519070",
      "reader": "Game:203249e0",
      "defaultInitializer": "Game:20324780",
      "addressGetter": "Game:20324560",
      "descriptor": "207c17f8",
      "vtable": "2069813c",
      "descriptorStore": {
        "address": "205190b9",
        "bytes": "c705f8177c203c816920",
        "assembly": "MOV dword ptr [0x207c17f8],0x2069813c"
      },
      "offsetStore": {
        "address": "205190d2",
        "bytes": "c70514187c2068000000",
        "assembly": "MOV dword ptr [0x207c1814],0x68"
      },
      "defaultStore": {
        "address": "205190dc",
        "bytes": "c70518187c2000000000",
        "assembly": "MOV dword ptr [0x207c1818],0x0"
      },
      "nameLiteral": {
        "address": "20656894",
        "bytes": "4c6173745370656c6c00",
        "instruction": {
          "address": "20519090",
          "bytes": "6894686520",
          "assembly": "PUSH 0x20656894"
        }
      },
      "nameLiteralUses": [
        {
          "address": "20656894",
          "bytes": "4c6173745370656c6c00",
          "instruction": {
            "address": "20519090",
            "bytes": "6894686520",
            "assembly": "PUSH 0x20656894"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "actual bCPropertyID::CreateRandom on descriptor-resolved destination",
        "requiresService": "actual random PropertyID generator; no inferred all-zero ID",
        "source": "Game:20324780",
        "nativeOffset": 104,
        "typeName": "bCPropertyID"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "BookOfFlood",
      "nativeOffset": 132,
      "typeName": "long",
      "registrar": "Game:20519160",
      "reader": "Game:203237d0",
      "defaultInitializer": "Game:20323580",
      "addressGetter": "Game:20323360",
      "descriptor": "207c181c",
      "vtable": "2069802c",
      "descriptorStore": {
        "address": "205191a9",
        "bytes": "c7051c187c202c806920",
        "assembly": "MOV dword ptr [0x207c181c],0x2069802c"
      },
      "offsetStore": {
        "address": "205191c2",
        "bytes": "c70538187c2084000000",
        "assembly": "MOV dword ptr [0x207c1838],0x84"
      },
      "defaultStore": {
        "address": "205191cc",
        "bytes": "c7053c187c2000000000",
        "assembly": "MOV dword ptr [0x207c183c],0x0"
      },
      "nameLiteral": {
        "address": "2065dc4c",
        "bytes": "426f6f6b4f66466c6f6f6400",
        "instruction": {
          "address": "20519180",
          "bytes": "684cdc6520",
          "assembly": "PUSH 0x2065dc4c"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dc4c",
          "bytes": "426f6f6b4f66466c6f6f6400",
          "instruction": {
            "address": "20519180",
            "bytes": "684cdc6520",
            "assembly": "PUSH 0x2065dc4c"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20323580",
        "nativeOffset": 132,
        "typeName": "long"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "BookOfRhobar",
      "nativeOffset": 136,
      "typeName": "long",
      "registrar": "Game:20519250",
      "reader": "Game:203237d0",
      "defaultInitializer": "Game:20323580",
      "addressGetter": "Game:20323360",
      "descriptor": "207c1840",
      "vtable": "2069802c",
      "descriptorStore": {
        "address": "20519299",
        "bytes": "c70540187c202c806920",
        "assembly": "MOV dword ptr [0x207c1840],0x2069802c"
      },
      "offsetStore": {
        "address": "205192b2",
        "bytes": "c7055c187c2088000000",
        "assembly": "MOV dword ptr [0x207c185c],0x88"
      },
      "defaultStore": {
        "address": "205192bc",
        "bytes": "c70560187c2000000000",
        "assembly": "MOV dword ptr [0x207c1860],0x0"
      },
      "nameLiteral": {
        "address": "2065dc5c",
        "bytes": "426f6f6b4f6652686f62617200",
        "instruction": {
          "address": "20519270",
          "bytes": "685cdc6520",
          "assembly": "PUSH 0x2065dc5c"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dc5c",
          "bytes": "426f6f6b4f6652686f62617200",
          "instruction": {
            "address": "20519270",
            "bytes": "685cdc6520",
            "assembly": "PUSH 0x2065dc5c"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20323580",
        "nativeOffset": 136,
        "typeName": "long"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "BookOfZuben",
      "nativeOffset": 140,
      "typeName": "long",
      "registrar": "Game:20519340",
      "reader": "Game:203237d0",
      "defaultInitializer": "Game:20323580",
      "addressGetter": "Game:20323360",
      "descriptor": "207c1864",
      "vtable": "2069802c",
      "descriptorStore": {
        "address": "20519389",
        "bytes": "c70564187c202c806920",
        "assembly": "MOV dword ptr [0x207c1864],0x2069802c"
      },
      "offsetStore": {
        "address": "205193a2",
        "bytes": "c70580187c208c000000",
        "assembly": "MOV dword ptr [0x207c1880],0x8c"
      },
      "defaultStore": {
        "address": "205193ac",
        "bytes": "c70584187c2000000000",
        "assembly": "MOV dword ptr [0x207c1884],0x0"
      },
      "nameLiteral": {
        "address": "2065dc6c",
        "bytes": "426f6f6b4f665a7562656e00",
        "instruction": {
          "address": "20519360",
          "bytes": "686cdc6520",
          "assembly": "PUSH 0x2065dc6c"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dc6c",
          "bytes": "426f6f6b4f665a7562656e00",
          "instruction": {
            "address": "20519360",
            "bytes": "686cdc6520",
            "assembly": "PUSH 0x2065dc6c"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20323580",
        "nativeOffset": 140,
        "typeName": "long"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "DuskToDawnStartHour",
      "nativeOffset": 144,
      "typeName": "long",
      "registrar": "Game:20519430",
      "reader": "Game:203237d0",
      "defaultInitializer": "Game:20323580",
      "addressGetter": "Game:20323360",
      "descriptor": "207c1888",
      "vtable": "2069802c",
      "descriptorStore": {
        "address": "20519479",
        "bytes": "c70588187c202c806920",
        "assembly": "MOV dword ptr [0x207c1888],0x2069802c"
      },
      "offsetStore": {
        "address": "20519492",
        "bytes": "c705a4187c2090000000",
        "assembly": "MOV dword ptr [0x207c18a4],0x90"
      },
      "defaultStore": {
        "address": "2051949c",
        "bytes": "c705a8187c2000000000",
        "assembly": "MOV dword ptr [0x207c18a8],0x0"
      },
      "nameLiteral": {
        "address": "2065dc7c",
        "bytes": "4475736b546f4461776e5374617274486f757200",
        "instruction": {
          "address": "20519450",
          "bytes": "687cdc6520",
          "assembly": "PUSH 0x2065dc7c"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dc7c",
          "bytes": "4475736b546f4461776e5374617274486f757200",
          "instruction": {
            "address": "20519450",
            "bytes": "687cdc6520",
            "assembly": "PUSH 0x2065dc7c"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20323580",
        "nativeOffset": 144,
        "typeName": "long"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "Chapter",
      "nativeOffset": 148,
      "typeName": "long",
      "registrar": "Game:20519520",
      "reader": "Game:203237d0",
      "defaultInitializer": "Game:20323580",
      "addressGetter": "Game:20323360",
      "descriptor": "207c18ac",
      "vtable": "2069802c",
      "descriptorStore": {
        "address": "20519569",
        "bytes": "c705ac187c202c806920",
        "assembly": "MOV dword ptr [0x207c18ac],0x2069802c"
      },
      "offsetStore": {
        "address": "20519582",
        "bytes": "c705c8187c2094000000",
        "assembly": "MOV dword ptr [0x207c18c8],0x94"
      },
      "defaultStore": {
        "address": "2051958c",
        "bytes": "c705cc187c2000000000",
        "assembly": "MOV dword ptr [0x207c18cc],0x0"
      },
      "nameLiteral": {
        "address": "2065dc94",
        "bytes": "4368617074657200",
        "instruction": {
          "address": "20519540",
          "bytes": "6894dc6520",
          "assembly": "PUSH 0x2065dc94"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dc94",
          "bytes": "4368617074657200",
          "instruction": {
            "address": "20519540",
            "bytes": "6894dc6520",
            "assembly": "PUSH 0x2065dc94"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20323580",
        "nativeOffset": 148,
        "typeName": "long"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "TutorialFlags",
      "nativeOffset": 152,
      "typeName": "long",
      "registrar": "Game:20519610",
      "reader": "Game:20325b20",
      "defaultInitializer": "Game:203258d0",
      "addressGetter": "Game:203256b0",
      "descriptor": "207c18d0",
      "vtable": "2069824c",
      "descriptorStore": {
        "address": "20519659",
        "bytes": "c705d0187c204c826920",
        "assembly": "MOV dword ptr [0x207c18d0],0x2069824c"
      },
      "offsetStore": {
        "address": "20519672",
        "bytes": "c705ec187c2098000000",
        "assembly": "MOV dword ptr [0x207c18ec],0x98"
      },
      "defaultStore": {
        "address": "2051967c",
        "bytes": "c705f0187c2000000000",
        "assembly": "MOV dword ptr [0x207c18f0],0x0"
      },
      "nameLiteral": {
        "address": "2065dca0",
        "bytes": "5475746f7269616c466c61677300",
        "instruction": {
          "address": "20519630",
          "bytes": "68a0dc6520",
          "assembly": "PUSH 0x2065dca0"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dca0",
          "bytes": "5475746f7269616c466c61677300",
          "instruction": {
            "address": "20519630",
            "bytes": "68a0dc6520",
            "assembly": "PUSH 0x2065dca0"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:203258d0",
        "nativeOffset": 152,
        "typeName": "long"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "TalkedToDiego",
      "nativeOffset": 156,
      "typeName": "bool",
      "registrar": "Game:20519700",
      "reader": "Game:203221c0",
      "defaultInitializer": "Game:20321f70",
      "addressGetter": "Game:20321d50",
      "descriptor": "207c18f4",
      "vtable": "20697e0c",
      "descriptorStore": {
        "address": "20519749",
        "bytes": "c705f4187c200c7e6920",
        "assembly": "MOV dword ptr [0x207c18f4],0x20697e0c"
      },
      "offsetStore": {
        "address": "20519762",
        "bytes": "c70510197c209c000000",
        "assembly": "MOV dword ptr [0x207c1910],0x9c"
      },
      "defaultStore": {
        "address": "2051976c",
        "bytes": "c70514197c2000000000",
        "assembly": "MOV dword ptr [0x207c1914],0x0"
      },
      "nameLiteral": {
        "address": "2065dcb0",
        "bytes": "54616c6b6564546f446965676f00",
        "instruction": {
          "address": "20519720",
          "bytes": "68b0dc6520",
          "assembly": "PUSH 0x2065dcb0"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dcb0",
          "bytes": "54616c6b6564546f446965676f00",
          "instruction": {
            "address": "20519720",
            "bytes": "68b0dc6520",
            "assembly": "PUSH 0x2065dcb0"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero byte at actual descriptor-resolved destination",
        "value": false,
        "bytes": "00",
        "source": "Game:20321f70",
        "nativeOffset": 156,
        "typeName": "bool"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "TalkedToGorn",
      "nativeOffset": 157,
      "typeName": "bool",
      "registrar": "Game:205197f0",
      "reader": "Game:203221c0",
      "defaultInitializer": "Game:20321f70",
      "addressGetter": "Game:20321d50",
      "descriptor": "207c1918",
      "vtable": "20697e0c",
      "descriptorStore": {
        "address": "20519839",
        "bytes": "c70518197c200c7e6920",
        "assembly": "MOV dword ptr [0x207c1918],0x20697e0c"
      },
      "offsetStore": {
        "address": "20519852",
        "bytes": "c70534197c209d000000",
        "assembly": "MOV dword ptr [0x207c1934],0x9d"
      },
      "defaultStore": {
        "address": "2051985c",
        "bytes": "c70538197c2000000000",
        "assembly": "MOV dword ptr [0x207c1938],0x0"
      },
      "nameLiteral": {
        "address": "2065dcc0",
        "bytes": "54616c6b6564546f476f726e00",
        "instruction": {
          "address": "20519810",
          "bytes": "68c0dc6520",
          "assembly": "PUSH 0x2065dcc0"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dcc0",
          "bytes": "54616c6b6564546f476f726e00",
          "instruction": {
            "address": "20519810",
            "bytes": "68c0dc6520",
            "assembly": "PUSH 0x2065dcc0"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero byte at actual descriptor-resolved destination",
        "value": false,
        "bytes": "00",
        "source": "Game:20321f70",
        "nativeOffset": 157,
        "typeName": "bool"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "TalkedToMilten",
      "nativeOffset": 158,
      "typeName": "bool",
      "registrar": "Game:205198e0",
      "reader": "Game:203221c0",
      "defaultInitializer": "Game:20321f70",
      "addressGetter": "Game:20321d50",
      "descriptor": "207c193c",
      "vtable": "20697e0c",
      "descriptorStore": {
        "address": "20519929",
        "bytes": "c7053c197c200c7e6920",
        "assembly": "MOV dword ptr [0x207c193c],0x20697e0c"
      },
      "offsetStore": {
        "address": "20519942",
        "bytes": "c70558197c209e000000",
        "assembly": "MOV dword ptr [0x207c1958],0x9e"
      },
      "defaultStore": {
        "address": "2051994c",
        "bytes": "c7055c197c2000000000",
        "assembly": "MOV dword ptr [0x207c195c],0x0"
      },
      "nameLiteral": {
        "address": "2065dcd0",
        "bytes": "54616c6b6564546f4d696c74656e00",
        "instruction": {
          "address": "20519900",
          "bytes": "68d0dc6520",
          "assembly": "PUSH 0x2065dcd0"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dcd0",
          "bytes": "54616c6b6564546f4d696c74656e00",
          "instruction": {
            "address": "20519900",
            "bytes": "68d0dc6520",
            "assembly": "PUSH 0x2065dcd0"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero byte at actual descriptor-resolved destination",
        "value": false,
        "bytes": "00",
        "source": "Game:20321f70",
        "nativeOffset": 158,
        "typeName": "bool"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "TalkedToLester",
      "nativeOffset": 159,
      "typeName": "bool",
      "registrar": "Game:205199d0",
      "reader": "Game:203221c0",
      "defaultInitializer": "Game:20321f70",
      "addressGetter": "Game:20321d50",
      "descriptor": "207c1960",
      "vtable": "20697e0c",
      "descriptorStore": {
        "address": "20519a19",
        "bytes": "c70560197c200c7e6920",
        "assembly": "MOV dword ptr [0x207c1960],0x20697e0c"
      },
      "offsetStore": {
        "address": "20519a32",
        "bytes": "c7057c197c209f000000",
        "assembly": "MOV dword ptr [0x207c197c],0x9f"
      },
      "defaultStore": {
        "address": "20519a3c",
        "bytes": "c70580197c2000000000",
        "assembly": "MOV dword ptr [0x207c1980],0x0"
      },
      "nameLiteral": {
        "address": "2065dce4",
        "bytes": "54616c6b6564546f4c657374657200",
        "instruction": {
          "address": "205199f0",
          "bytes": "68e4dc6520",
          "assembly": "PUSH 0x2065dce4"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dce4",
          "bytes": "54616c6b6564546f4c657374657200",
          "instruction": {
            "address": "205199f0",
            "bytes": "68e4dc6520",
            "assembly": "PUSH 0x2065dce4"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero byte at actual descriptor-resolved destination",
        "value": false,
        "bytes": "00",
        "source": "Game:20321f70",
        "nativeOffset": 159,
        "typeName": "bool"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "TimeStampStart",
      "nativeOffset": 160,
      "typeName": "float",
      "registrar": "Game:20519ac0",
      "reader": "Game:20325290",
      "defaultInitializer": "Game:20325030",
      "addressGetter": "Game:20324e10",
      "descriptor": "207c1984",
      "vtable": "206981c4",
      "descriptorStore": {
        "address": "20519b09",
        "bytes": "c70584197c20c4816920",
        "assembly": "MOV dword ptr [0x207c1984],0x206981c4"
      },
      "offsetStore": {
        "address": "20519b22",
        "bytes": "c705a0197c20a0000000",
        "assembly": "MOV dword ptr [0x207c19a0],0xa0"
      },
      "defaultStore": {
        "address": "20519b2c",
        "bytes": "c705a4197c2000000000",
        "assembly": "MOV dword ptr [0x207c19a4],0x0"
      },
      "nameLiteral": {
        "address": "2065dcf8",
        "bytes": "54696d655374616d70537461727400",
        "instruction": {
          "address": "20519ae0",
          "bytes": "68f8dc6520",
          "assembly": "PUSH 0x2065dcf8"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dcf8",
          "bytes": "54696d655374616d70537461727400",
          "instruction": {
            "address": "20519ae0",
            "bytes": "68f8dc6520",
            "assembly": "PUSH 0x2065dcf8"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero DWORD at actual descriptor-resolved destination",
        "value": 0,
        "bytes": "00000000",
        "source": "Game:20325030",
        "nativeOffset": 160,
        "typeName": "float"
      }
    },
    {
      "className": "gCPlayerMemory_PS",
      "name": "IsConsumingItem",
      "nativeOffset": 164,
      "typeName": "bool",
      "registrar": "Game:20519bb0",
      "reader": "Game:203221c0",
      "defaultInitializer": "Game:20321f70",
      "addressGetter": "Game:20321d50",
      "descriptor": "207c19a8",
      "vtable": "20697e0c",
      "descriptorStore": {
        "address": "20519bf9",
        "bytes": "c705a8197c200c7e6920",
        "assembly": "MOV dword ptr [0x207c19a8],0x20697e0c"
      },
      "offsetStore": {
        "address": "20519c12",
        "bytes": "c705c4197c20a4000000",
        "assembly": "MOV dword ptr [0x207c19c4],0xa4"
      },
      "defaultStore": {
        "address": "20519c1c",
        "bytes": "c705c8197c2000000000",
        "assembly": "MOV dword ptr [0x207c19c8],0x0"
      },
      "nameLiteral": {
        "address": "2065dd0c",
        "bytes": "4973436f6e73756d696e674974656d00",
        "instruction": {
          "address": "20519bd0",
          "bytes": "680cdd6520",
          "assembly": "PUSH 0x2065dd0c"
        }
      },
      "nameLiteralUses": [
        {
          "address": "2065dd0c",
          "bytes": "4973436f6e73756d696e674974656d00",
          "instruction": {
            "address": "20519bd0",
            "bytes": "680cdd6520",
            "assembly": "PUSH 0x2065dd0c"
          }
        }
      ],
      "defaultBehavior": {
        "behavior": "write zero byte at actual descriptor-resolved destination",
        "value": false,
        "bytes": "00",
        "source": "Game:20321f70",
        "nativeOffset": 164,
        "typeName": "bool"
      }
    }
  ],
  "nativeBytes": 184,
  "allocationTag": 196,
  "propertyType": 60,
  "wrapperVtable": "20697d2c",
  "nativeVersion": 5,
  "nativeReadVersion": 5,
  "nativeObjectVersion": 6,
  "getVersion": 6,
  "sources": {
    "clone": "Game:20328880",
    "create": "Game:2031d4a0",
    "wrapperRead": "Game:20320970",
    "dataRead": "Game:20328200"
  },
  "hero": {
    "className": "gCPlayerMemory_PS",
    "outerVersion": 5,
    "nativeReadVersion": 5,
    "objectVersion": 83,
    "propertyVersion": 30,
    "sourceOffset": 1189475,
    "endSourceOffset": 1191088,
    "serializedRaw": "0500010001010001830d01000053005300380600001e0018000000840d10001e000100000000850d8b001e00050000000100000000860d9f001e00290000000109000000000000000000000000000000000000000000000000000000000000000000000000000000870d9f001e00290000000109000000000000000000000000000000000000000000000000000000000000000000000000000000880d9f001e00290000000109000000000000000000000000000000000000000000000000000000000000000000000000000000890d8a0d1e000e00000001090000000000000000000000008b0d1c001e0004000000000000008c0d1c001e0004000000000000008d0d1c001e0004000000000000008e0d0c001e0004000000000000008f0d0c001e000400000000000000900d910d1e00060000000100000000001c0cba0b1e0014000000e3f3194ca998c64faeaf3e865599e60c00000000920d1c001e000400000000000000930d1c001e000400000000000000940d1c001e000400000000000000950d1c001e000400000000000000960d1c001e000400000000000000970d1c001e000400000000000000980d10001e000100000000990d10001e0001000000009a0d10001e0001000000009b0d10001e0001000000009c0d0c001e00040000000000000005000f000000a5020100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a5029f0d27001e000400000000000000a00d27001e0004000000640000000100a50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a50c9f0d27001e000400000000000000a00d27001e00040000006400000001009d020100010100019d0d01000053005300300000001e00030000009e0d51001e00020000009d029f0d27001e000400000000000000a00d27001e0004000000640000000100c409010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000c4099f0d27001e000400000000000000a00d27001e000400000064000000010077010100010100019d0d01000053005300300000001e00030000009e0d51001e000200000077019f0d27001e000400000000000000a00d27001e0004000000640000000100ec000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000ec009f0d27001e000400000000000000a00d27001e0004000000640000000100b60c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b60c9f0d27001e000400000000000000a00d27001e0004000000640000000100d2000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000d2009f0d27001e000400000000000000a00d27001e0004000000640000000100fb09010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000fb099f0d27001e000400000000000000a00d27001e000400000064000000010041040100010100019d0d01000053005300300000001e00030000009e0d51001e000200000041049f0d27001e000400000000000000a00d27001e0004000000640000000100b40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b40c9f0d27001e000400000000000000a00d27001e0004000000640000000100a40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a40c9f0d27001e000400000000000000a00d27001e0004000000640000000100b50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b50c9f0d27001e000400000000000000a00d27001e0004000000640000000100490a010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000490a9f0d27001e000400000000000000a00d27001e0004000000640000000100b70c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b70c9f0d27001e000400000000000000a00d27001e0004000000640000000100dec0adde",
    "serializedSha256": "a87767e871bf6a1b83e91c58c13350db5b353bbedc0d440bc02b618b2b508135",
    "properties": [
      {
        "name": "HideTips",
        "type": "bool",
        "raw": "00",
        "value": null,
        "offset": 1189512,
        "sourceOffset": 1189512,
        "recordOffset": 1189502,
        "recordSourceOffset": 1189502,
        "nameStringIndex": 3460,
        "typeStringIndex": 16,
        "magic": 30,
        "byteLength": 1,
        "inlineStrings": false,
        "recordHeaderRaw": "840d10001e0001000000"
      },
      {
        "name": "PlayerKnows",
        "type": "bTObjArray<class bCString>",
        "raw": "0100000000",
        "value": null,
        "offset": 1189523,
        "sourceOffset": 1189523,
        "recordOffset": 1189513,
        "recordSourceOffset": 1189513,
        "nameStringIndex": 3461,
        "typeStringIndex": 139,
        "magic": 30,
        "byteLength": 5,
        "inlineStrings": false,
        "recordHeaderRaw": "850d8b001e0005000000"
      },
      {
        "name": "PoliticalFame",
        "type": "bTValArray<long>",
        "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "value": null,
        "offset": 1189538,
        "sourceOffset": 1189538,
        "recordOffset": 1189528,
        "recordSourceOffset": 1189528,
        "nameStringIndex": 3462,
        "typeStringIndex": 159,
        "magic": 30,
        "byteLength": 41,
        "inlineStrings": false,
        "recordHeaderRaw": "860d9f001e0029000000"
      },
      {
        "name": "PoliticalSuspectComment",
        "type": "bTValArray<long>",
        "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "value": null,
        "offset": 1189589,
        "sourceOffset": 1189589,
        "recordOffset": 1189579,
        "recordSourceOffset": 1189579,
        "nameStringIndex": 3463,
        "typeStringIndex": 159,
        "magic": 30,
        "byteLength": 41,
        "inlineStrings": false,
        "recordHeaderRaw": "870d9f001e0029000000"
      },
      {
        "name": "PoliticalCrimeCount",
        "type": "bTValArray<long>",
        "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "value": null,
        "offset": 1189640,
        "sourceOffset": 1189640,
        "recordOffset": 1189630,
        "recordSourceOffset": 1189630,
        "nameStringIndex": 3464,
        "typeStringIndex": 159,
        "magic": 30,
        "byteLength": 41,
        "inlineStrings": false,
        "recordHeaderRaw": "880d9f001e0029000000"
      },
      {
        "name": "PoliticalPlayerCrime",
        "type": "bTValArray<bool>",
        "raw": "0109000000000000000000000000",
        "value": null,
        "offset": 1189691,
        "sourceOffset": 1189691,
        "recordOffset": 1189681,
        "recordSourceOffset": 1189681,
        "nameStringIndex": 3465,
        "typeStringIndex": 3466,
        "magic": 30,
        "byteLength": 14,
        "inlineStrings": false,
        "recordHeaderRaw": "890d8a0d1e000e000000"
      },
      {
        "name": "XP",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1189715,
        "sourceOffset": 1189715,
        "recordOffset": 1189705,
        "recordSourceOffset": 1189705,
        "nameStringIndex": 3467,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "8b0d1c001e0004000000"
      },
      {
        "name": "LPAttribs",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1189729,
        "sourceOffset": 1189729,
        "recordOffset": 1189719,
        "recordSourceOffset": 1189719,
        "nameStringIndex": 3468,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "8c0d1c001e0004000000"
      },
      {
        "name": "LPPerks",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1189743,
        "sourceOffset": 1189743,
        "recordOffset": 1189733,
        "recordSourceOffset": 1189733,
        "nameStringIndex": 3469,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "8d0d1c001e0004000000"
      },
      {
        "name": "SecondsTransformRemain",
        "type": "float",
        "raw": "00000000",
        "value": null,
        "offset": 1189757,
        "sourceOffset": 1189757,
        "recordOffset": 1189747,
        "recordSourceOffset": 1189747,
        "nameStringIndex": 3470,
        "typeStringIndex": 12,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "8e0d0c001e0004000000"
      },
      {
        "name": "SecondsMistRemain",
        "type": "float",
        "raw": "00000000",
        "value": null,
        "offset": 1189771,
        "sourceOffset": 1189771,
        "recordOffset": 1189761,
        "recordSourceOffset": 1189761,
        "nameStringIndex": 3471,
        "typeStringIndex": 12,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "8f0d0c001e0004000000"
      },
      {
        "name": "LastWeaponConfig",
        "type": "bTPropertyContainer<enum gEWeaponConfig>",
        "raw": "010000000000",
        "value": null,
        "offset": 1189785,
        "sourceOffset": 1189785,
        "recordOffset": 1189775,
        "recordSourceOffset": 1189775,
        "nameStringIndex": 3472,
        "typeStringIndex": 3473,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "900d910d1e0006000000"
      },
      {
        "name": "LastSpell",
        "type": "bCPropertyID",
        "raw": "e3f3194ca998c64faeaf3e865599e60c00000000",
        "value": null,
        "offset": 1189801,
        "sourceOffset": 1189801,
        "recordOffset": 1189791,
        "recordSourceOffset": 1189791,
        "nameStringIndex": 3100,
        "typeStringIndex": 3002,
        "magic": 30,
        "byteLength": 20,
        "inlineStrings": false,
        "recordHeaderRaw": "1c0cba0b1e0014000000"
      },
      {
        "name": "BookOfFlood",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1189831,
        "sourceOffset": 1189831,
        "recordOffset": 1189821,
        "recordSourceOffset": 1189821,
        "nameStringIndex": 3474,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "920d1c001e0004000000"
      },
      {
        "name": "BookOfRhobar",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1189845,
        "sourceOffset": 1189845,
        "recordOffset": 1189835,
        "recordSourceOffset": 1189835,
        "nameStringIndex": 3475,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "930d1c001e0004000000"
      },
      {
        "name": "BookOfZuben",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1189859,
        "sourceOffset": 1189859,
        "recordOffset": 1189849,
        "recordSourceOffset": 1189849,
        "nameStringIndex": 3476,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "940d1c001e0004000000"
      },
      {
        "name": "DuskToDawnStartHour",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1189873,
        "sourceOffset": 1189873,
        "recordOffset": 1189863,
        "recordSourceOffset": 1189863,
        "nameStringIndex": 3477,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "950d1c001e0004000000"
      },
      {
        "name": "Chapter",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1189887,
        "sourceOffset": 1189887,
        "recordOffset": 1189877,
        "recordSourceOffset": 1189877,
        "nameStringIndex": 3478,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "960d1c001e0004000000"
      },
      {
        "name": "TutorialFlags",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1189901,
        "sourceOffset": 1189901,
        "recordOffset": 1189891,
        "recordSourceOffset": 1189891,
        "nameStringIndex": 3479,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "970d1c001e0004000000"
      },
      {
        "name": "TalkedToDiego",
        "type": "bool",
        "raw": "00",
        "value": null,
        "offset": 1189915,
        "sourceOffset": 1189915,
        "recordOffset": 1189905,
        "recordSourceOffset": 1189905,
        "nameStringIndex": 3480,
        "typeStringIndex": 16,
        "magic": 30,
        "byteLength": 1,
        "inlineStrings": false,
        "recordHeaderRaw": "980d10001e0001000000"
      },
      {
        "name": "TalkedToGorn",
        "type": "bool",
        "raw": "00",
        "value": null,
        "offset": 1189926,
        "sourceOffset": 1189926,
        "recordOffset": 1189916,
        "recordSourceOffset": 1189916,
        "nameStringIndex": 3481,
        "typeStringIndex": 16,
        "magic": 30,
        "byteLength": 1,
        "inlineStrings": false,
        "recordHeaderRaw": "990d10001e0001000000"
      },
      {
        "name": "TalkedToMilten",
        "type": "bool",
        "raw": "00",
        "value": null,
        "offset": 1189937,
        "sourceOffset": 1189937,
        "recordOffset": 1189927,
        "recordSourceOffset": 1189927,
        "nameStringIndex": 3482,
        "typeStringIndex": 16,
        "magic": 30,
        "byteLength": 1,
        "inlineStrings": false,
        "recordHeaderRaw": "9a0d10001e0001000000"
      },
      {
        "name": "TalkedToLester",
        "type": "bool",
        "raw": "00",
        "value": null,
        "offset": 1189948,
        "sourceOffset": 1189948,
        "recordOffset": 1189938,
        "recordSourceOffset": 1189938,
        "nameStringIndex": 3483,
        "typeStringIndex": 16,
        "magic": 30,
        "byteLength": 1,
        "inlineStrings": false,
        "recordHeaderRaw": "9b0d10001e0001000000"
      },
      {
        "name": "TimeStampStart",
        "type": "float",
        "raw": "00000000",
        "value": null,
        "offset": 1189959,
        "sourceOffset": 1189959,
        "recordOffset": 1189949,
        "recordSourceOffset": 1189949,
        "nameStringIndex": 3484,
        "typeStringIndex": 12,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "9c0d0c001e0004000000"
      }
    ],
    "tailRaw": "0f000000a5020100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a5029f0d27001e000400000000000000a00d27001e0004000000640000000100a50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a50c9f0d27001e000400000000000000a00d27001e00040000006400000001009d020100010100019d0d01000053005300300000001e00030000009e0d51001e00020000009d029f0d27001e000400000000000000a00d27001e0004000000640000000100c409010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000c4099f0d27001e000400000000000000a00d27001e000400000064000000010077010100010100019d0d01000053005300300000001e00030000009e0d51001e000200000077019f0d27001e000400000000000000a00d27001e0004000000640000000100ec000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000ec009f0d27001e000400000000000000a00d27001e0004000000640000000100b60c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b60c9f0d27001e000400000000000000a00d27001e0004000000640000000100d2000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000d2009f0d27001e000400000000000000a00d27001e0004000000640000000100fb09010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000fb099f0d27001e000400000000000000a00d27001e000400000064000000010041040100010100019d0d01000053005300300000001e00030000009e0d51001e000200000041049f0d27001e000400000000000000a00d27001e0004000000640000000100b40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b40c9f0d27001e000400000000000000a00d27001e0004000000640000000100a40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a40c9f0d27001e000400000000000000a00d27001e0004000000640000000100b50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b50c9f0d27001e000400000000000000a00d27001e0004000000640000000100490a010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000490a9f0d27001e000400000000000000a00d27001e0004000000640000000100b70c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b70c9f0d27001e000400000000000000a00d27001e0004000000640000000100",
    "nativeReadOffset": 1189963,
    "worldResident": false
  },
  "nativePropertyDefaults": {
    "HideTips": {
      "behavior": "write zero byte at actual descriptor-resolved destination",
      "value": false,
      "bytes": "00",
      "source": "Game:20321f70",
      "nativeOffset": 20,
      "typeName": "bool"
    },
    "PlayerKnows": {
      "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
      "payloadWritten": false,
      "freshEmptyHeaderFromConstructor": true,
      "source": "Game:20322670",
      "nativeOffset": 24,
      "typeName": "bTObjArray<class bCString>"
    },
    "PoliticalFame": {
      "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
      "payloadWritten": false,
      "freshEmptyHeaderFromConstructor": true,
      "source": "Game:20322ac0",
      "nativeOffset": 36,
      "typeName": "bTValArray<long>"
    },
    "PoliticalSuspectComment": {
      "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
      "payloadWritten": false,
      "freshEmptyHeaderFromConstructor": true,
      "source": "Game:20322ac0",
      "nativeOffset": 48,
      "typeName": "bTValArray<long>"
    },
    "PoliticalCrimeCount": {
      "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
      "payloadWritten": false,
      "freshEmptyHeaderFromConstructor": true,
      "source": "Game:20322ac0",
      "nativeOffset": 60,
      "typeName": "bTValArray<long>"
    },
    "PoliticalPlayerCrime": {
      "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
      "payloadWritten": false,
      "freshEmptyHeaderFromConstructor": true,
      "source": "Game:20322f50",
      "nativeOffset": 72,
      "typeName": "bTValArray<bool>"
    },
    "XP": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20323580",
      "nativeOffset": 84,
      "typeName": "long"
    },
    "LPAttribs": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20323580",
      "nativeOffset": 88,
      "typeName": "long"
    },
    "LPPerks": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20323580",
      "nativeOffset": 92,
      "typeName": "long"
    },
    "SecondsTransformRemain": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20325030",
      "nativeOffset": 124,
      "typeName": "float"
    },
    "SecondsMistRemain": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20325030",
      "nativeOffset": 128,
      "typeName": "float"
    },
    "LastWeaponConfig": {
      "behavior": "dispatch actual embedded container +0x18; 20320a30 copies mutable global207c1578",
      "liveValueKnown": false,
      "liveGlobal": "207c1578",
      "source": "Game:20323ee0",
      "nativeOffset": 96,
      "typeName": "bTPropertyContainer<enum gEWeaponConfig>"
    },
    "LastSpell": {
      "behavior": "actual bCPropertyID::CreateRandom on descriptor-resolved destination",
      "requiresService": "actual random PropertyID generator; no inferred all-zero ID",
      "source": "Game:20324780",
      "nativeOffset": 104,
      "typeName": "bCPropertyID"
    },
    "BookOfFlood": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20323580",
      "nativeOffset": 132,
      "typeName": "long"
    },
    "BookOfRhobar": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20323580",
      "nativeOffset": 136,
      "typeName": "long"
    },
    "BookOfZuben": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20323580",
      "nativeOffset": 140,
      "typeName": "long"
    },
    "DuskToDawnStartHour": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20323580",
      "nativeOffset": 144,
      "typeName": "long"
    },
    "Chapter": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20323580",
      "nativeOffset": 148,
      "typeName": "long"
    },
    "TutorialFlags": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:203258d0",
      "nativeOffset": 152,
      "typeName": "long"
    },
    "TalkedToDiego": {
      "behavior": "write zero byte at actual descriptor-resolved destination",
      "value": false,
      "bytes": "00",
      "source": "Game:20321f70",
      "nativeOffset": 156,
      "typeName": "bool"
    },
    "TalkedToGorn": {
      "behavior": "write zero byte at actual descriptor-resolved destination",
      "value": false,
      "bytes": "00",
      "source": "Game:20321f70",
      "nativeOffset": 157,
      "typeName": "bool"
    },
    "TalkedToMilten": {
      "behavior": "write zero byte at actual descriptor-resolved destination",
      "value": false,
      "bytes": "00",
      "source": "Game:20321f70",
      "nativeOffset": 158,
      "typeName": "bool"
    },
    "TalkedToLester": {
      "behavior": "write zero byte at actual descriptor-resolved destination",
      "value": false,
      "bytes": "00",
      "source": "Game:20321f70",
      "nativeOffset": 159,
      "typeName": "bool"
    },
    "TimeStampStart": {
      "behavior": "write zero DWORD at actual descriptor-resolved destination",
      "value": 0,
      "bytes": "00000000",
      "source": "Game:20325030",
      "nativeOffset": 160,
      "typeName": "float"
    },
    "IsConsumingItem": {
      "behavior": "write zero byte at actual descriptor-resolved destination",
      "value": false,
      "bytes": "00",
      "source": "Game:20321f70",
      "nativeOffset": 164,
      "typeName": "bool"
    }
  },
  "freshConstruction": {
    "nativeBytes": 184,
    "allocationTag": 196,
    "propertyType": 60,
    "nativeVtable": "2069845c",
    "wrapperVtable": "20697d2c",
    "rootRegistrar": "Game:205184d0",
    "rootObject": "207c1638",
    "constructor": "Game:2031e9c0",
    "constructorExport": "Game:20036cdc",
    "copyConstructorExport": "Game:2000cce3",
    "copyConstructor": "Game:2031e440",
    "copyConstructorIsFresh": false,
    "allocator": "Game:20327f10",
    "wrapperClone": "Game:20328880",
    "initialize": "Game:20328570",
    "attach": "Game:2031f540",
    "wrapperRead": "Game:20320970",
    "dataRead": "Game:20328200",
    "nativeVersion": 5,
    "nativeObjectVersion": 6,
    "getVersion": 6,
    "nativeReadVersion": 5,
    "fields": [
      {
        "className": "gCPlayerMemory_PS",
        "name": "HideTips",
        "nativeOffset": 20,
        "typeName": "bool",
        "registrar": "Game:20518530",
        "reader": "Game:203221c0",
        "defaultInitializer": "Game:20321f70",
        "addressGetter": "Game:20321d50",
        "descriptor": "207c1648",
        "vtable": "20697e0c",
        "descriptorStore": {
          "address": "20518579",
          "bytes": "c70548167c200c7e6920",
          "assembly": "MOV dword ptr [0x207c1648],0x20697e0c"
        },
        "offsetStore": {
          "address": "20518592",
          "bytes": "c70564167c2014000000",
          "assembly": "MOV dword ptr [0x207c1664],0x14"
        },
        "defaultStore": {
          "address": "2051859c",
          "bytes": "c70568167c2000000000",
          "assembly": "MOV dword ptr [0x207c1668],0x0"
        },
        "nameLiteral": {
          "address": "2065dbf0",
          "bytes": "486964655469707300",
          "instruction": {
            "address": "20518550",
            "bytes": "68f0db6520",
            "assembly": "PUSH 0x2065dbf0"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dbf0",
            "bytes": "486964655469707300",
            "instruction": {
              "address": "20518550",
              "bytes": "68f0db6520",
              "assembly": "PUSH 0x2065dbf0"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero byte at actual descriptor-resolved destination",
          "value": false,
          "bytes": "00",
          "source": "Game:20321f70",
          "nativeOffset": 20,
          "typeName": "bool"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "PlayerKnows",
        "nativeOffset": 24,
        "typeName": "bTObjArray<class bCString>",
        "registrar": "Game:20518620",
        "reader": "Game:20327040",
        "defaultInitializer": "Game:20322670",
        "addressGetter": "Game:20322450",
        "descriptor": "207c166c",
        "vtable": "20697e94",
        "descriptorStore": {
          "address": "20518669",
          "bytes": "c7056c167c20947e6920",
          "assembly": "MOV dword ptr [0x207c166c],0x20697e94"
        },
        "offsetStore": {
          "address": "20518682",
          "bytes": "c70588167c2018000000",
          "assembly": "MOV dword ptr [0x207c1688],0x18"
        },
        "defaultStore": {
          "address": "2051868c",
          "bytes": "c7058c167c2000000000",
          "assembly": "MOV dword ptr [0x207c168c],0x0"
        },
        "nameLiteral": {
          "address": "2065e2bc",
          "bytes": "506c617965724b6e6f777300",
          "instruction": {
            "address": "20518640",
            "bytes": "68bce26520",
            "assembly": "PUSH 0x2065e2bc"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065e2bc",
            "bytes": "506c617965724b6e6f777300",
            "instruction": {
              "address": "20518640",
              "bytes": "68bce26520",
              "assembly": "PUSH 0x2065e2bc"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
          "payloadWritten": false,
          "freshEmptyHeaderFromConstructor": true,
          "source": "Game:20322670",
          "nativeOffset": 24,
          "typeName": "bTObjArray<class bCString>"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "PoliticalFame",
        "nativeOffset": 36,
        "typeName": "bTValArray<long>",
        "registrar": "Game:20518710",
        "reader": "Game:20326cb0",
        "defaultInitializer": "Game:20322ac0",
        "addressGetter": "Game:203228a0",
        "descriptor": "207c1690",
        "vtable": "20697f1c",
        "descriptorStore": {
          "address": "20518759",
          "bytes": "c70590167c201c7f6920",
          "assembly": "MOV dword ptr [0x207c1690],0x20697f1c"
        },
        "offsetStore": {
          "address": "20518772",
          "bytes": "c705ac167c2024000000",
          "assembly": "MOV dword ptr [0x207c16ac],0x24"
        },
        "defaultStore": {
          "address": "2051877c",
          "bytes": "c705b0167c2000000000",
          "assembly": "MOV dword ptr [0x207c16b0],0x0"
        },
        "nameLiteral": {
          "address": "2065e2cc",
          "bytes": "506f6c69746963616c46616d6500",
          "instruction": {
            "address": "20518730",
            "bytes": "68cce26520",
            "assembly": "PUSH 0x2065e2cc"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065e2cc",
            "bytes": "506f6c69746963616c46616d6500",
            "instruction": {
              "address": "20518730",
              "bytes": "68cce26520",
              "assembly": "PUSH 0x2065e2cc"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
          "payloadWritten": false,
          "freshEmptyHeaderFromConstructor": true,
          "source": "Game:20322ac0",
          "nativeOffset": 36,
          "typeName": "bTValArray<long>"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "PoliticalSuspectComment",
        "nativeOffset": 48,
        "typeName": "bTValArray<long>",
        "registrar": "Game:20518800",
        "reader": "Game:20326cb0",
        "defaultInitializer": "Game:20322ac0",
        "addressGetter": "Game:203228a0",
        "descriptor": "207c16b4",
        "vtable": "20697f1c",
        "descriptorStore": {
          "address": "20518849",
          "bytes": "c705b4167c201c7f6920",
          "assembly": "MOV dword ptr [0x207c16b4],0x20697f1c"
        },
        "offsetStore": {
          "address": "20518862",
          "bytes": "c705d0167c2030000000",
          "assembly": "MOV dword ptr [0x207c16d0],0x30"
        },
        "defaultStore": {
          "address": "2051886c",
          "bytes": "c705d4167c2000000000",
          "assembly": "MOV dword ptr [0x207c16d4],0x0"
        },
        "nameLiteral": {
          "address": "2065e2dc",
          "bytes": "506f6c69746963616c53757370656374436f6d6d656e7400",
          "instruction": {
            "address": "20518820",
            "bytes": "68dce26520",
            "assembly": "PUSH 0x2065e2dc"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065e2dc",
            "bytes": "506f6c69746963616c53757370656374436f6d6d656e7400",
            "instruction": {
              "address": "20518820",
              "bytes": "68dce26520",
              "assembly": "PUSH 0x2065e2dc"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
          "payloadWritten": false,
          "freshEmptyHeaderFromConstructor": true,
          "source": "Game:20322ac0",
          "nativeOffset": 48,
          "typeName": "bTValArray<long>"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "PoliticalCrimeCount",
        "nativeOffset": 60,
        "typeName": "bTValArray<long>",
        "registrar": "Game:205188f0",
        "reader": "Game:20326cb0",
        "defaultInitializer": "Game:20322ac0",
        "addressGetter": "Game:203228a0",
        "descriptor": "207c16d8",
        "vtable": "20697f1c",
        "descriptorStore": {
          "address": "20518939",
          "bytes": "c705d8167c201c7f6920",
          "assembly": "MOV dword ptr [0x207c16d8],0x20697f1c"
        },
        "offsetStore": {
          "address": "20518952",
          "bytes": "c705f4167c203c000000",
          "assembly": "MOV dword ptr [0x207c16f4],0x3c"
        },
        "defaultStore": {
          "address": "2051895c",
          "bytes": "c705f8167c2000000000",
          "assembly": "MOV dword ptr [0x207c16f8],0x0"
        },
        "nameLiteral": {
          "address": "2065e2f8",
          "bytes": "506f6c69746963616c4372696d65436f756e7400",
          "instruction": {
            "address": "20518910",
            "bytes": "68f8e26520",
            "assembly": "PUSH 0x2065e2f8"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065e2f8",
            "bytes": "506f6c69746963616c4372696d65436f756e7400",
            "instruction": {
              "address": "20518910",
              "bytes": "68f8e26520",
              "assembly": "PUSH 0x2065e2f8"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
          "payloadWritten": false,
          "freshEmptyHeaderFromConstructor": true,
          "source": "Game:20322ac0",
          "nativeOffset": 60,
          "typeName": "bTValArray<long>"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "PoliticalPlayerCrime",
        "nativeOffset": 72,
        "typeName": "bTValArray<bool>",
        "registrar": "Game:205189e0",
        "reader": "Game:20326db0",
        "defaultInitializer": "Game:20322f50",
        "addressGetter": "Game:20322cf0",
        "descriptor": "207c16fc",
        "vtable": "20697fa4",
        "descriptorStore": {
          "address": "20518a29",
          "bytes": "c705fc167c20a47f6920",
          "assembly": "MOV dword ptr [0x207c16fc],0x20697fa4"
        },
        "offsetStore": {
          "address": "20518a42",
          "bytes": "c70518177c2048000000",
          "assembly": "MOV dword ptr [0x207c1718],0x48"
        },
        "defaultStore": {
          "address": "20518a4c",
          "bytes": "c7051c177c2000000000",
          "assembly": "MOV dword ptr [0x207c171c],0x0"
        },
        "nameLiteral": {
          "address": "2065e310",
          "bytes": "506f6c69746963616c506c617965724372696d6500",
          "instruction": {
            "address": "20518a00",
            "bytes": "6810e36520",
            "assembly": "PUSH 0x2065e310"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065e310",
            "bytes": "506f6c69746963616c506c617965724372696d6500",
            "instruction": {
              "address": "20518a00",
              "bytes": "6810e36520",
              "assembly": "PUSH 0x2065e310"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "tail JMP actual descriptor addressGetter +0x64 only; no payload mutation",
          "payloadWritten": false,
          "freshEmptyHeaderFromConstructor": true,
          "source": "Game:20322f50",
          "nativeOffset": 72,
          "typeName": "bTValArray<bool>"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "XP",
        "nativeOffset": 84,
        "typeName": "long",
        "registrar": "Game:20518ad0",
        "reader": "Game:203237d0",
        "defaultInitializer": "Game:20323580",
        "addressGetter": "Game:20323360",
        "descriptor": "207c1720",
        "vtable": "2069802c",
        "descriptorStore": {
          "address": "20518b19",
          "bytes": "c70520177c202c806920",
          "assembly": "MOV dword ptr [0x207c1720],0x2069802c"
        },
        "offsetStore": {
          "address": "20518b32",
          "bytes": "c7053c177c2054000000",
          "assembly": "MOV dword ptr [0x207c173c],0x54"
        },
        "defaultStore": {
          "address": "20518b3c",
          "bytes": "c70540177c2000000000",
          "assembly": "MOV dword ptr [0x207c1740],0x0"
        },
        "nameLiteral": {
          "address": "2065dbfc",
          "bytes": "585000",
          "instruction": {
            "address": "20518af0",
            "bytes": "68fcdb6520",
            "assembly": "PUSH 0x2065dbfc"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dbfc",
            "bytes": "585000",
            "instruction": {
              "address": "20518af0",
              "bytes": "68fcdb6520",
              "assembly": "PUSH 0x2065dbfc"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20323580",
          "nativeOffset": 84,
          "typeName": "long"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "LPAttribs",
        "nativeOffset": 88,
        "typeName": "long",
        "registrar": "Game:20518bc0",
        "reader": "Game:203237d0",
        "defaultInitializer": "Game:20323580",
        "addressGetter": "Game:20323360",
        "descriptor": "207c1744",
        "vtable": "2069802c",
        "descriptorStore": {
          "address": "20518c09",
          "bytes": "c70544177c202c806920",
          "assembly": "MOV dword ptr [0x207c1744],0x2069802c"
        },
        "offsetStore": {
          "address": "20518c22",
          "bytes": "c70560177c2058000000",
          "assembly": "MOV dword ptr [0x207c1760],0x58"
        },
        "defaultStore": {
          "address": "20518c2c",
          "bytes": "c70564177c2000000000",
          "assembly": "MOV dword ptr [0x207c1764],0x0"
        },
        "nameLiteral": {
          "address": "2065dc00",
          "bytes": "4c504174747269627300",
          "instruction": {
            "address": "20518be0",
            "bytes": "6800dc6520",
            "assembly": "PUSH 0x2065dc00"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dc00",
            "bytes": "4c504174747269627300",
            "instruction": {
              "address": "20518be0",
              "bytes": "6800dc6520",
              "assembly": "PUSH 0x2065dc00"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20323580",
          "nativeOffset": 88,
          "typeName": "long"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "LPPerks",
        "nativeOffset": 92,
        "typeName": "long",
        "registrar": "Game:20518cb0",
        "reader": "Game:203237d0",
        "defaultInitializer": "Game:20323580",
        "addressGetter": "Game:20323360",
        "descriptor": "207c1768",
        "vtable": "2069802c",
        "descriptorStore": {
          "address": "20518cf9",
          "bytes": "c70568177c202c806920",
          "assembly": "MOV dword ptr [0x207c1768],0x2069802c"
        },
        "offsetStore": {
          "address": "20518d12",
          "bytes": "c70584177c205c000000",
          "assembly": "MOV dword ptr [0x207c1784],0x5c"
        },
        "defaultStore": {
          "address": "20518d1c",
          "bytes": "c70588177c2000000000",
          "assembly": "MOV dword ptr [0x207c1788],0x0"
        },
        "nameLiteral": {
          "address": "2065dc0c",
          "bytes": "4c505065726b7300",
          "instruction": {
            "address": "20518cd0",
            "bytes": "680cdc6520",
            "assembly": "PUSH 0x2065dc0c"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dc0c",
            "bytes": "4c505065726b7300",
            "instruction": {
              "address": "20518cd0",
              "bytes": "680cdc6520",
              "assembly": "PUSH 0x2065dc0c"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20323580",
          "nativeOffset": 92,
          "typeName": "long"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "SecondsTransformRemain",
        "nativeOffset": 124,
        "typeName": "float",
        "registrar": "Game:20518da0",
        "reader": "Game:20325290",
        "defaultInitializer": "Game:20325030",
        "addressGetter": "Game:20324e10",
        "descriptor": "207c178c",
        "vtable": "206981c4",
        "descriptorStore": {
          "address": "20518de9",
          "bytes": "c7058c177c20c4816920",
          "assembly": "MOV dword ptr [0x207c178c],0x206981c4"
        },
        "offsetStore": {
          "address": "20518e02",
          "bytes": "c705a8177c207c000000",
          "assembly": "MOV dword ptr [0x207c17a8],0x7c"
        },
        "defaultStore": {
          "address": "20518e0c",
          "bytes": "c705ac177c2000000000",
          "assembly": "MOV dword ptr [0x207c17ac],0x0"
        },
        "nameLiteral": {
          "address": "2065dc18",
          "bytes": "5365636f6e64735472616e73666f726d52656d61696e00",
          "instruction": {
            "address": "20518dc0",
            "bytes": "6818dc6520",
            "assembly": "PUSH 0x2065dc18"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dc18",
            "bytes": "5365636f6e64735472616e73666f726d52656d61696e00",
            "instruction": {
              "address": "20518dc0",
              "bytes": "6818dc6520",
              "assembly": "PUSH 0x2065dc18"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20325030",
          "nativeOffset": 124,
          "typeName": "float"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "SecondsMistRemain",
        "nativeOffset": 128,
        "typeName": "float",
        "registrar": "Game:20518e90",
        "reader": "Game:20325290",
        "defaultInitializer": "Game:20325030",
        "addressGetter": "Game:20324e10",
        "descriptor": "207c17b0",
        "vtable": "206981c4",
        "descriptorStore": {
          "address": "20518ed9",
          "bytes": "c705b0177c20c4816920",
          "assembly": "MOV dword ptr [0x207c17b0],0x206981c4"
        },
        "offsetStore": {
          "address": "20518ef2",
          "bytes": "c705cc177c2080000000",
          "assembly": "MOV dword ptr [0x207c17cc],0x80"
        },
        "defaultStore": {
          "address": "20518efc",
          "bytes": "c705d0177c2000000000",
          "assembly": "MOV dword ptr [0x207c17d0],0x0"
        },
        "nameLiteral": {
          "address": "2065dc34",
          "bytes": "5365636f6e64734d69737452656d61696e00",
          "instruction": {
            "address": "20518eb0",
            "bytes": "6834dc6520",
            "assembly": "PUSH 0x2065dc34"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dc34",
            "bytes": "5365636f6e64734d69737452656d61696e00",
            "instruction": {
              "address": "20518eb0",
              "bytes": "6834dc6520",
              "assembly": "PUSH 0x2065dc34"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20325030",
          "nativeOffset": 128,
          "typeName": "float"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "LastWeaponConfig",
        "nativeOffset": 96,
        "typeName": "bTPropertyContainer<enum gEWeaponConfig>",
        "registrar": "Game:20518f80",
        "reader": "Game:20324140",
        "defaultInitializer": "Game:20323ee0",
        "addressGetter": "Game:20323bf0",
        "descriptor": "207c17d4",
        "vtable": "206980b4",
        "descriptorStore": {
          "address": "20518fc9",
          "bytes": "c705d4177c20b4806920",
          "assembly": "MOV dword ptr [0x207c17d4],0x206980b4"
        },
        "offsetStore": {
          "address": "20518fe2",
          "bytes": "c705f0177c2060000000",
          "assembly": "MOV dword ptr [0x207c17f0],0x60"
        },
        "defaultStore": {
          "address": "20518fec",
          "bytes": "c705f4177c2000000000",
          "assembly": "MOV dword ptr [0x207c17f4],0x0"
        },
        "nameLiteral": {
          "address": "2065e23c",
          "bytes": "4c617374576561706f6e436f6e66696700",
          "instruction": {
            "address": "20518fa0",
            "bytes": "683ce26520",
            "assembly": "PUSH 0x2065e23c"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065e23c",
            "bytes": "4c617374576561706f6e436f6e66696700",
            "instruction": {
              "address": "20518fa0",
              "bytes": "683ce26520",
              "assembly": "PUSH 0x2065e23c"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "dispatch actual embedded container +0x18; 20320a30 copies mutable global207c1578",
          "liveValueKnown": false,
          "liveGlobal": "207c1578",
          "source": "Game:20323ee0",
          "nativeOffset": 96,
          "typeName": "bTPropertyContainer<enum gEWeaponConfig>"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "LastSpell",
        "nativeOffset": 104,
        "typeName": "bCPropertyID",
        "registrar": "Game:20519070",
        "reader": "Game:203249e0",
        "defaultInitializer": "Game:20324780",
        "addressGetter": "Game:20324560",
        "descriptor": "207c17f8",
        "vtable": "2069813c",
        "descriptorStore": {
          "address": "205190b9",
          "bytes": "c705f8177c203c816920",
          "assembly": "MOV dword ptr [0x207c17f8],0x2069813c"
        },
        "offsetStore": {
          "address": "205190d2",
          "bytes": "c70514187c2068000000",
          "assembly": "MOV dword ptr [0x207c1814],0x68"
        },
        "defaultStore": {
          "address": "205190dc",
          "bytes": "c70518187c2000000000",
          "assembly": "MOV dword ptr [0x207c1818],0x0"
        },
        "nameLiteral": {
          "address": "20656894",
          "bytes": "4c6173745370656c6c00",
          "instruction": {
            "address": "20519090",
            "bytes": "6894686520",
            "assembly": "PUSH 0x20656894"
          }
        },
        "nameLiteralUses": [
          {
            "address": "20656894",
            "bytes": "4c6173745370656c6c00",
            "instruction": {
              "address": "20519090",
              "bytes": "6894686520",
              "assembly": "PUSH 0x20656894"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "actual bCPropertyID::CreateRandom on descriptor-resolved destination",
          "requiresService": "actual random PropertyID generator; no inferred all-zero ID",
          "source": "Game:20324780",
          "nativeOffset": 104,
          "typeName": "bCPropertyID"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "BookOfFlood",
        "nativeOffset": 132,
        "typeName": "long",
        "registrar": "Game:20519160",
        "reader": "Game:203237d0",
        "defaultInitializer": "Game:20323580",
        "addressGetter": "Game:20323360",
        "descriptor": "207c181c",
        "vtable": "2069802c",
        "descriptorStore": {
          "address": "205191a9",
          "bytes": "c7051c187c202c806920",
          "assembly": "MOV dword ptr [0x207c181c],0x2069802c"
        },
        "offsetStore": {
          "address": "205191c2",
          "bytes": "c70538187c2084000000",
          "assembly": "MOV dword ptr [0x207c1838],0x84"
        },
        "defaultStore": {
          "address": "205191cc",
          "bytes": "c7053c187c2000000000",
          "assembly": "MOV dword ptr [0x207c183c],0x0"
        },
        "nameLiteral": {
          "address": "2065dc4c",
          "bytes": "426f6f6b4f66466c6f6f6400",
          "instruction": {
            "address": "20519180",
            "bytes": "684cdc6520",
            "assembly": "PUSH 0x2065dc4c"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dc4c",
            "bytes": "426f6f6b4f66466c6f6f6400",
            "instruction": {
              "address": "20519180",
              "bytes": "684cdc6520",
              "assembly": "PUSH 0x2065dc4c"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20323580",
          "nativeOffset": 132,
          "typeName": "long"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "BookOfRhobar",
        "nativeOffset": 136,
        "typeName": "long",
        "registrar": "Game:20519250",
        "reader": "Game:203237d0",
        "defaultInitializer": "Game:20323580",
        "addressGetter": "Game:20323360",
        "descriptor": "207c1840",
        "vtable": "2069802c",
        "descriptorStore": {
          "address": "20519299",
          "bytes": "c70540187c202c806920",
          "assembly": "MOV dword ptr [0x207c1840],0x2069802c"
        },
        "offsetStore": {
          "address": "205192b2",
          "bytes": "c7055c187c2088000000",
          "assembly": "MOV dword ptr [0x207c185c],0x88"
        },
        "defaultStore": {
          "address": "205192bc",
          "bytes": "c70560187c2000000000",
          "assembly": "MOV dword ptr [0x207c1860],0x0"
        },
        "nameLiteral": {
          "address": "2065dc5c",
          "bytes": "426f6f6b4f6652686f62617200",
          "instruction": {
            "address": "20519270",
            "bytes": "685cdc6520",
            "assembly": "PUSH 0x2065dc5c"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dc5c",
            "bytes": "426f6f6b4f6652686f62617200",
            "instruction": {
              "address": "20519270",
              "bytes": "685cdc6520",
              "assembly": "PUSH 0x2065dc5c"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20323580",
          "nativeOffset": 136,
          "typeName": "long"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "BookOfZuben",
        "nativeOffset": 140,
        "typeName": "long",
        "registrar": "Game:20519340",
        "reader": "Game:203237d0",
        "defaultInitializer": "Game:20323580",
        "addressGetter": "Game:20323360",
        "descriptor": "207c1864",
        "vtable": "2069802c",
        "descriptorStore": {
          "address": "20519389",
          "bytes": "c70564187c202c806920",
          "assembly": "MOV dword ptr [0x207c1864],0x2069802c"
        },
        "offsetStore": {
          "address": "205193a2",
          "bytes": "c70580187c208c000000",
          "assembly": "MOV dword ptr [0x207c1880],0x8c"
        },
        "defaultStore": {
          "address": "205193ac",
          "bytes": "c70584187c2000000000",
          "assembly": "MOV dword ptr [0x207c1884],0x0"
        },
        "nameLiteral": {
          "address": "2065dc6c",
          "bytes": "426f6f6b4f665a7562656e00",
          "instruction": {
            "address": "20519360",
            "bytes": "686cdc6520",
            "assembly": "PUSH 0x2065dc6c"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dc6c",
            "bytes": "426f6f6b4f665a7562656e00",
            "instruction": {
              "address": "20519360",
              "bytes": "686cdc6520",
              "assembly": "PUSH 0x2065dc6c"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20323580",
          "nativeOffset": 140,
          "typeName": "long"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "DuskToDawnStartHour",
        "nativeOffset": 144,
        "typeName": "long",
        "registrar": "Game:20519430",
        "reader": "Game:203237d0",
        "defaultInitializer": "Game:20323580",
        "addressGetter": "Game:20323360",
        "descriptor": "207c1888",
        "vtable": "2069802c",
        "descriptorStore": {
          "address": "20519479",
          "bytes": "c70588187c202c806920",
          "assembly": "MOV dword ptr [0x207c1888],0x2069802c"
        },
        "offsetStore": {
          "address": "20519492",
          "bytes": "c705a4187c2090000000",
          "assembly": "MOV dword ptr [0x207c18a4],0x90"
        },
        "defaultStore": {
          "address": "2051949c",
          "bytes": "c705a8187c2000000000",
          "assembly": "MOV dword ptr [0x207c18a8],0x0"
        },
        "nameLiteral": {
          "address": "2065dc7c",
          "bytes": "4475736b546f4461776e5374617274486f757200",
          "instruction": {
            "address": "20519450",
            "bytes": "687cdc6520",
            "assembly": "PUSH 0x2065dc7c"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dc7c",
            "bytes": "4475736b546f4461776e5374617274486f757200",
            "instruction": {
              "address": "20519450",
              "bytes": "687cdc6520",
              "assembly": "PUSH 0x2065dc7c"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20323580",
          "nativeOffset": 144,
          "typeName": "long"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "Chapter",
        "nativeOffset": 148,
        "typeName": "long",
        "registrar": "Game:20519520",
        "reader": "Game:203237d0",
        "defaultInitializer": "Game:20323580",
        "addressGetter": "Game:20323360",
        "descriptor": "207c18ac",
        "vtable": "2069802c",
        "descriptorStore": {
          "address": "20519569",
          "bytes": "c705ac187c202c806920",
          "assembly": "MOV dword ptr [0x207c18ac],0x2069802c"
        },
        "offsetStore": {
          "address": "20519582",
          "bytes": "c705c8187c2094000000",
          "assembly": "MOV dword ptr [0x207c18c8],0x94"
        },
        "defaultStore": {
          "address": "2051958c",
          "bytes": "c705cc187c2000000000",
          "assembly": "MOV dword ptr [0x207c18cc],0x0"
        },
        "nameLiteral": {
          "address": "2065dc94",
          "bytes": "4368617074657200",
          "instruction": {
            "address": "20519540",
            "bytes": "6894dc6520",
            "assembly": "PUSH 0x2065dc94"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dc94",
            "bytes": "4368617074657200",
            "instruction": {
              "address": "20519540",
              "bytes": "6894dc6520",
              "assembly": "PUSH 0x2065dc94"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20323580",
          "nativeOffset": 148,
          "typeName": "long"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "TutorialFlags",
        "nativeOffset": 152,
        "typeName": "long",
        "registrar": "Game:20519610",
        "reader": "Game:20325b20",
        "defaultInitializer": "Game:203258d0",
        "addressGetter": "Game:203256b0",
        "descriptor": "207c18d0",
        "vtable": "2069824c",
        "descriptorStore": {
          "address": "20519659",
          "bytes": "c705d0187c204c826920",
          "assembly": "MOV dword ptr [0x207c18d0],0x2069824c"
        },
        "offsetStore": {
          "address": "20519672",
          "bytes": "c705ec187c2098000000",
          "assembly": "MOV dword ptr [0x207c18ec],0x98"
        },
        "defaultStore": {
          "address": "2051967c",
          "bytes": "c705f0187c2000000000",
          "assembly": "MOV dword ptr [0x207c18f0],0x0"
        },
        "nameLiteral": {
          "address": "2065dca0",
          "bytes": "5475746f7269616c466c61677300",
          "instruction": {
            "address": "20519630",
            "bytes": "68a0dc6520",
            "assembly": "PUSH 0x2065dca0"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dca0",
            "bytes": "5475746f7269616c466c61677300",
            "instruction": {
              "address": "20519630",
              "bytes": "68a0dc6520",
              "assembly": "PUSH 0x2065dca0"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:203258d0",
          "nativeOffset": 152,
          "typeName": "long"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "TalkedToDiego",
        "nativeOffset": 156,
        "typeName": "bool",
        "registrar": "Game:20519700",
        "reader": "Game:203221c0",
        "defaultInitializer": "Game:20321f70",
        "addressGetter": "Game:20321d50",
        "descriptor": "207c18f4",
        "vtable": "20697e0c",
        "descriptorStore": {
          "address": "20519749",
          "bytes": "c705f4187c200c7e6920",
          "assembly": "MOV dword ptr [0x207c18f4],0x20697e0c"
        },
        "offsetStore": {
          "address": "20519762",
          "bytes": "c70510197c209c000000",
          "assembly": "MOV dword ptr [0x207c1910],0x9c"
        },
        "defaultStore": {
          "address": "2051976c",
          "bytes": "c70514197c2000000000",
          "assembly": "MOV dword ptr [0x207c1914],0x0"
        },
        "nameLiteral": {
          "address": "2065dcb0",
          "bytes": "54616c6b6564546f446965676f00",
          "instruction": {
            "address": "20519720",
            "bytes": "68b0dc6520",
            "assembly": "PUSH 0x2065dcb0"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dcb0",
            "bytes": "54616c6b6564546f446965676f00",
            "instruction": {
              "address": "20519720",
              "bytes": "68b0dc6520",
              "assembly": "PUSH 0x2065dcb0"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero byte at actual descriptor-resolved destination",
          "value": false,
          "bytes": "00",
          "source": "Game:20321f70",
          "nativeOffset": 156,
          "typeName": "bool"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "TalkedToGorn",
        "nativeOffset": 157,
        "typeName": "bool",
        "registrar": "Game:205197f0",
        "reader": "Game:203221c0",
        "defaultInitializer": "Game:20321f70",
        "addressGetter": "Game:20321d50",
        "descriptor": "207c1918",
        "vtable": "20697e0c",
        "descriptorStore": {
          "address": "20519839",
          "bytes": "c70518197c200c7e6920",
          "assembly": "MOV dword ptr [0x207c1918],0x20697e0c"
        },
        "offsetStore": {
          "address": "20519852",
          "bytes": "c70534197c209d000000",
          "assembly": "MOV dword ptr [0x207c1934],0x9d"
        },
        "defaultStore": {
          "address": "2051985c",
          "bytes": "c70538197c2000000000",
          "assembly": "MOV dword ptr [0x207c1938],0x0"
        },
        "nameLiteral": {
          "address": "2065dcc0",
          "bytes": "54616c6b6564546f476f726e00",
          "instruction": {
            "address": "20519810",
            "bytes": "68c0dc6520",
            "assembly": "PUSH 0x2065dcc0"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dcc0",
            "bytes": "54616c6b6564546f476f726e00",
            "instruction": {
              "address": "20519810",
              "bytes": "68c0dc6520",
              "assembly": "PUSH 0x2065dcc0"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero byte at actual descriptor-resolved destination",
          "value": false,
          "bytes": "00",
          "source": "Game:20321f70",
          "nativeOffset": 157,
          "typeName": "bool"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "TalkedToMilten",
        "nativeOffset": 158,
        "typeName": "bool",
        "registrar": "Game:205198e0",
        "reader": "Game:203221c0",
        "defaultInitializer": "Game:20321f70",
        "addressGetter": "Game:20321d50",
        "descriptor": "207c193c",
        "vtable": "20697e0c",
        "descriptorStore": {
          "address": "20519929",
          "bytes": "c7053c197c200c7e6920",
          "assembly": "MOV dword ptr [0x207c193c],0x20697e0c"
        },
        "offsetStore": {
          "address": "20519942",
          "bytes": "c70558197c209e000000",
          "assembly": "MOV dword ptr [0x207c1958],0x9e"
        },
        "defaultStore": {
          "address": "2051994c",
          "bytes": "c7055c197c2000000000",
          "assembly": "MOV dword ptr [0x207c195c],0x0"
        },
        "nameLiteral": {
          "address": "2065dcd0",
          "bytes": "54616c6b6564546f4d696c74656e00",
          "instruction": {
            "address": "20519900",
            "bytes": "68d0dc6520",
            "assembly": "PUSH 0x2065dcd0"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dcd0",
            "bytes": "54616c6b6564546f4d696c74656e00",
            "instruction": {
              "address": "20519900",
              "bytes": "68d0dc6520",
              "assembly": "PUSH 0x2065dcd0"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero byte at actual descriptor-resolved destination",
          "value": false,
          "bytes": "00",
          "source": "Game:20321f70",
          "nativeOffset": 158,
          "typeName": "bool"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "TalkedToLester",
        "nativeOffset": 159,
        "typeName": "bool",
        "registrar": "Game:205199d0",
        "reader": "Game:203221c0",
        "defaultInitializer": "Game:20321f70",
        "addressGetter": "Game:20321d50",
        "descriptor": "207c1960",
        "vtable": "20697e0c",
        "descriptorStore": {
          "address": "20519a19",
          "bytes": "c70560197c200c7e6920",
          "assembly": "MOV dword ptr [0x207c1960],0x20697e0c"
        },
        "offsetStore": {
          "address": "20519a32",
          "bytes": "c7057c197c209f000000",
          "assembly": "MOV dword ptr [0x207c197c],0x9f"
        },
        "defaultStore": {
          "address": "20519a3c",
          "bytes": "c70580197c2000000000",
          "assembly": "MOV dword ptr [0x207c1980],0x0"
        },
        "nameLiteral": {
          "address": "2065dce4",
          "bytes": "54616c6b6564546f4c657374657200",
          "instruction": {
            "address": "205199f0",
            "bytes": "68e4dc6520",
            "assembly": "PUSH 0x2065dce4"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dce4",
            "bytes": "54616c6b6564546f4c657374657200",
            "instruction": {
              "address": "205199f0",
              "bytes": "68e4dc6520",
              "assembly": "PUSH 0x2065dce4"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero byte at actual descriptor-resolved destination",
          "value": false,
          "bytes": "00",
          "source": "Game:20321f70",
          "nativeOffset": 159,
          "typeName": "bool"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "TimeStampStart",
        "nativeOffset": 160,
        "typeName": "float",
        "registrar": "Game:20519ac0",
        "reader": "Game:20325290",
        "defaultInitializer": "Game:20325030",
        "addressGetter": "Game:20324e10",
        "descriptor": "207c1984",
        "vtable": "206981c4",
        "descriptorStore": {
          "address": "20519b09",
          "bytes": "c70584197c20c4816920",
          "assembly": "MOV dword ptr [0x207c1984],0x206981c4"
        },
        "offsetStore": {
          "address": "20519b22",
          "bytes": "c705a0197c20a0000000",
          "assembly": "MOV dword ptr [0x207c19a0],0xa0"
        },
        "defaultStore": {
          "address": "20519b2c",
          "bytes": "c705a4197c2000000000",
          "assembly": "MOV dword ptr [0x207c19a4],0x0"
        },
        "nameLiteral": {
          "address": "2065dcf8",
          "bytes": "54696d655374616d70537461727400",
          "instruction": {
            "address": "20519ae0",
            "bytes": "68f8dc6520",
            "assembly": "PUSH 0x2065dcf8"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dcf8",
            "bytes": "54696d655374616d70537461727400",
            "instruction": {
              "address": "20519ae0",
              "bytes": "68f8dc6520",
              "assembly": "PUSH 0x2065dcf8"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero DWORD at actual descriptor-resolved destination",
          "value": 0,
          "bytes": "00000000",
          "source": "Game:20325030",
          "nativeOffset": 160,
          "typeName": "float"
        }
      },
      {
        "className": "gCPlayerMemory_PS",
        "name": "IsConsumingItem",
        "nativeOffset": 164,
        "typeName": "bool",
        "registrar": "Game:20519bb0",
        "reader": "Game:203221c0",
        "defaultInitializer": "Game:20321f70",
        "addressGetter": "Game:20321d50",
        "descriptor": "207c19a8",
        "vtable": "20697e0c",
        "descriptorStore": {
          "address": "20519bf9",
          "bytes": "c705a8197c200c7e6920",
          "assembly": "MOV dword ptr [0x207c19a8],0x20697e0c"
        },
        "offsetStore": {
          "address": "20519c12",
          "bytes": "c705c4197c20a4000000",
          "assembly": "MOV dword ptr [0x207c19c4],0xa4"
        },
        "defaultStore": {
          "address": "20519c1c",
          "bytes": "c705c8197c2000000000",
          "assembly": "MOV dword ptr [0x207c19c8],0x0"
        },
        "nameLiteral": {
          "address": "2065dd0c",
          "bytes": "4973436f6e73756d696e674974656d00",
          "instruction": {
            "address": "20519bd0",
            "bytes": "680cdd6520",
            "assembly": "PUSH 0x2065dd0c"
          }
        },
        "nameLiteralUses": [
          {
            "address": "2065dd0c",
            "bytes": "4973436f6e73756d696e674974656d00",
            "instruction": {
              "address": "20519bd0",
              "bytes": "680cdd6520",
              "assembly": "PUSH 0x2065dd0c"
            }
          }
        ],
        "defaultBehavior": {
          "behavior": "write zero byte at actual descriptor-resolved destination",
          "value": false,
          "bytes": "00",
          "source": "Game:20321f70",
          "nativeOffset": 164,
          "typeName": "bool"
        }
      }
    ],
    "heroSerialized": {
      "className": "gCPlayerMemory_PS",
      "outerVersion": 5,
      "nativeReadVersion": 5,
      "objectVersion": 83,
      "propertyVersion": 30,
      "sourceOffset": 1189475,
      "endSourceOffset": 1191088,
      "serializedRaw": "0500010001010001830d01000053005300380600001e0018000000840d10001e000100000000850d8b001e00050000000100000000860d9f001e00290000000109000000000000000000000000000000000000000000000000000000000000000000000000000000870d9f001e00290000000109000000000000000000000000000000000000000000000000000000000000000000000000000000880d9f001e00290000000109000000000000000000000000000000000000000000000000000000000000000000000000000000890d8a0d1e000e00000001090000000000000000000000008b0d1c001e0004000000000000008c0d1c001e0004000000000000008d0d1c001e0004000000000000008e0d0c001e0004000000000000008f0d0c001e000400000000000000900d910d1e00060000000100000000001c0cba0b1e0014000000e3f3194ca998c64faeaf3e865599e60c00000000920d1c001e000400000000000000930d1c001e000400000000000000940d1c001e000400000000000000950d1c001e000400000000000000960d1c001e000400000000000000970d1c001e000400000000000000980d10001e000100000000990d10001e0001000000009a0d10001e0001000000009b0d10001e0001000000009c0d0c001e00040000000000000005000f000000a5020100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a5029f0d27001e000400000000000000a00d27001e0004000000640000000100a50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a50c9f0d27001e000400000000000000a00d27001e00040000006400000001009d020100010100019d0d01000053005300300000001e00030000009e0d51001e00020000009d029f0d27001e000400000000000000a00d27001e0004000000640000000100c409010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000c4099f0d27001e000400000000000000a00d27001e000400000064000000010077010100010100019d0d01000053005300300000001e00030000009e0d51001e000200000077019f0d27001e000400000000000000a00d27001e0004000000640000000100ec000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000ec009f0d27001e000400000000000000a00d27001e0004000000640000000100b60c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b60c9f0d27001e000400000000000000a00d27001e0004000000640000000100d2000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000d2009f0d27001e000400000000000000a00d27001e0004000000640000000100fb09010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000fb099f0d27001e000400000000000000a00d27001e000400000064000000010041040100010100019d0d01000053005300300000001e00030000009e0d51001e000200000041049f0d27001e000400000000000000a00d27001e0004000000640000000100b40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b40c9f0d27001e000400000000000000a00d27001e0004000000640000000100a40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a40c9f0d27001e000400000000000000a00d27001e0004000000640000000100b50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b50c9f0d27001e000400000000000000a00d27001e0004000000640000000100490a010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000490a9f0d27001e000400000000000000a00d27001e0004000000640000000100b70c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b70c9f0d27001e000400000000000000a00d27001e0004000000640000000100dec0adde",
      "serializedSha256": "a87767e871bf6a1b83e91c58c13350db5b353bbedc0d440bc02b618b2b508135",
      "properties": [
        {
          "name": "HideTips",
          "type": "bool",
          "raw": "00",
          "value": null,
          "offset": 1189512,
          "sourceOffset": 1189512,
          "recordOffset": 1189502,
          "recordSourceOffset": 1189502,
          "nameStringIndex": 3460,
          "typeStringIndex": 16,
          "magic": 30,
          "byteLength": 1,
          "inlineStrings": false,
          "recordHeaderRaw": "840d10001e0001000000"
        },
        {
          "name": "PlayerKnows",
          "type": "bTObjArray<class bCString>",
          "raw": "0100000000",
          "value": null,
          "offset": 1189523,
          "sourceOffset": 1189523,
          "recordOffset": 1189513,
          "recordSourceOffset": 1189513,
          "nameStringIndex": 3461,
          "typeStringIndex": 139,
          "magic": 30,
          "byteLength": 5,
          "inlineStrings": false,
          "recordHeaderRaw": "850d8b001e0005000000"
        },
        {
          "name": "PoliticalFame",
          "type": "bTValArray<long>",
          "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
          "value": null,
          "offset": 1189538,
          "sourceOffset": 1189538,
          "recordOffset": 1189528,
          "recordSourceOffset": 1189528,
          "nameStringIndex": 3462,
          "typeStringIndex": 159,
          "magic": 30,
          "byteLength": 41,
          "inlineStrings": false,
          "recordHeaderRaw": "860d9f001e0029000000"
        },
        {
          "name": "PoliticalSuspectComment",
          "type": "bTValArray<long>",
          "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
          "value": null,
          "offset": 1189589,
          "sourceOffset": 1189589,
          "recordOffset": 1189579,
          "recordSourceOffset": 1189579,
          "nameStringIndex": 3463,
          "typeStringIndex": 159,
          "magic": 30,
          "byteLength": 41,
          "inlineStrings": false,
          "recordHeaderRaw": "870d9f001e0029000000"
        },
        {
          "name": "PoliticalCrimeCount",
          "type": "bTValArray<long>",
          "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
          "value": null,
          "offset": 1189640,
          "sourceOffset": 1189640,
          "recordOffset": 1189630,
          "recordSourceOffset": 1189630,
          "nameStringIndex": 3464,
          "typeStringIndex": 159,
          "magic": 30,
          "byteLength": 41,
          "inlineStrings": false,
          "recordHeaderRaw": "880d9f001e0029000000"
        },
        {
          "name": "PoliticalPlayerCrime",
          "type": "bTValArray<bool>",
          "raw": "0109000000000000000000000000",
          "value": null,
          "offset": 1189691,
          "sourceOffset": 1189691,
          "recordOffset": 1189681,
          "recordSourceOffset": 1189681,
          "nameStringIndex": 3465,
          "typeStringIndex": 3466,
          "magic": 30,
          "byteLength": 14,
          "inlineStrings": false,
          "recordHeaderRaw": "890d8a0d1e000e000000"
        },
        {
          "name": "XP",
          "type": "long",
          "raw": "00000000",
          "value": null,
          "offset": 1189715,
          "sourceOffset": 1189715,
          "recordOffset": 1189705,
          "recordSourceOffset": 1189705,
          "nameStringIndex": 3467,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "8b0d1c001e0004000000"
        },
        {
          "name": "LPAttribs",
          "type": "long",
          "raw": "00000000",
          "value": null,
          "offset": 1189729,
          "sourceOffset": 1189729,
          "recordOffset": 1189719,
          "recordSourceOffset": 1189719,
          "nameStringIndex": 3468,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "8c0d1c001e0004000000"
        },
        {
          "name": "LPPerks",
          "type": "long",
          "raw": "00000000",
          "value": null,
          "offset": 1189743,
          "sourceOffset": 1189743,
          "recordOffset": 1189733,
          "recordSourceOffset": 1189733,
          "nameStringIndex": 3469,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "8d0d1c001e0004000000"
        },
        {
          "name": "SecondsTransformRemain",
          "type": "float",
          "raw": "00000000",
          "value": null,
          "offset": 1189757,
          "sourceOffset": 1189757,
          "recordOffset": 1189747,
          "recordSourceOffset": 1189747,
          "nameStringIndex": 3470,
          "typeStringIndex": 12,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "8e0d0c001e0004000000"
        },
        {
          "name": "SecondsMistRemain",
          "type": "float",
          "raw": "00000000",
          "value": null,
          "offset": 1189771,
          "sourceOffset": 1189771,
          "recordOffset": 1189761,
          "recordSourceOffset": 1189761,
          "nameStringIndex": 3471,
          "typeStringIndex": 12,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "8f0d0c001e0004000000"
        },
        {
          "name": "LastWeaponConfig",
          "type": "bTPropertyContainer<enum gEWeaponConfig>",
          "raw": "010000000000",
          "value": null,
          "offset": 1189785,
          "sourceOffset": 1189785,
          "recordOffset": 1189775,
          "recordSourceOffset": 1189775,
          "nameStringIndex": 3472,
          "typeStringIndex": 3473,
          "magic": 30,
          "byteLength": 6,
          "inlineStrings": false,
          "recordHeaderRaw": "900d910d1e0006000000"
        },
        {
          "name": "LastSpell",
          "type": "bCPropertyID",
          "raw": "e3f3194ca998c64faeaf3e865599e60c00000000",
          "value": null,
          "offset": 1189801,
          "sourceOffset": 1189801,
          "recordOffset": 1189791,
          "recordSourceOffset": 1189791,
          "nameStringIndex": 3100,
          "typeStringIndex": 3002,
          "magic": 30,
          "byteLength": 20,
          "inlineStrings": false,
          "recordHeaderRaw": "1c0cba0b1e0014000000"
        },
        {
          "name": "BookOfFlood",
          "type": "long",
          "raw": "00000000",
          "value": null,
          "offset": 1189831,
          "sourceOffset": 1189831,
          "recordOffset": 1189821,
          "recordSourceOffset": 1189821,
          "nameStringIndex": 3474,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "920d1c001e0004000000"
        },
        {
          "name": "BookOfRhobar",
          "type": "long",
          "raw": "00000000",
          "value": null,
          "offset": 1189845,
          "sourceOffset": 1189845,
          "recordOffset": 1189835,
          "recordSourceOffset": 1189835,
          "nameStringIndex": 3475,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "930d1c001e0004000000"
        },
        {
          "name": "BookOfZuben",
          "type": "long",
          "raw": "00000000",
          "value": null,
          "offset": 1189859,
          "sourceOffset": 1189859,
          "recordOffset": 1189849,
          "recordSourceOffset": 1189849,
          "nameStringIndex": 3476,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "940d1c001e0004000000"
        },
        {
          "name": "DuskToDawnStartHour",
          "type": "long",
          "raw": "00000000",
          "value": null,
          "offset": 1189873,
          "sourceOffset": 1189873,
          "recordOffset": 1189863,
          "recordSourceOffset": 1189863,
          "nameStringIndex": 3477,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "950d1c001e0004000000"
        },
        {
          "name": "Chapter",
          "type": "long",
          "raw": "00000000",
          "value": null,
          "offset": 1189887,
          "sourceOffset": 1189887,
          "recordOffset": 1189877,
          "recordSourceOffset": 1189877,
          "nameStringIndex": 3478,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "960d1c001e0004000000"
        },
        {
          "name": "TutorialFlags",
          "type": "long",
          "raw": "00000000",
          "value": null,
          "offset": 1189901,
          "sourceOffset": 1189901,
          "recordOffset": 1189891,
          "recordSourceOffset": 1189891,
          "nameStringIndex": 3479,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "970d1c001e0004000000"
        },
        {
          "name": "TalkedToDiego",
          "type": "bool",
          "raw": "00",
          "value": null,
          "offset": 1189915,
          "sourceOffset": 1189915,
          "recordOffset": 1189905,
          "recordSourceOffset": 1189905,
          "nameStringIndex": 3480,
          "typeStringIndex": 16,
          "magic": 30,
          "byteLength": 1,
          "inlineStrings": false,
          "recordHeaderRaw": "980d10001e0001000000"
        },
        {
          "name": "TalkedToGorn",
          "type": "bool",
          "raw": "00",
          "value": null,
          "offset": 1189926,
          "sourceOffset": 1189926,
          "recordOffset": 1189916,
          "recordSourceOffset": 1189916,
          "nameStringIndex": 3481,
          "typeStringIndex": 16,
          "magic": 30,
          "byteLength": 1,
          "inlineStrings": false,
          "recordHeaderRaw": "990d10001e0001000000"
        },
        {
          "name": "TalkedToMilten",
          "type": "bool",
          "raw": "00",
          "value": null,
          "offset": 1189937,
          "sourceOffset": 1189937,
          "recordOffset": 1189927,
          "recordSourceOffset": 1189927,
          "nameStringIndex": 3482,
          "typeStringIndex": 16,
          "magic": 30,
          "byteLength": 1,
          "inlineStrings": false,
          "recordHeaderRaw": "9a0d10001e0001000000"
        },
        {
          "name": "TalkedToLester",
          "type": "bool",
          "raw": "00",
          "value": null,
          "offset": 1189948,
          "sourceOffset": 1189948,
          "recordOffset": 1189938,
          "recordSourceOffset": 1189938,
          "nameStringIndex": 3483,
          "typeStringIndex": 16,
          "magic": 30,
          "byteLength": 1,
          "inlineStrings": false,
          "recordHeaderRaw": "9b0d10001e0001000000"
        },
        {
          "name": "TimeStampStart",
          "type": "float",
          "raw": "00000000",
          "value": null,
          "offset": 1189959,
          "sourceOffset": 1189959,
          "recordOffset": 1189949,
          "recordSourceOffset": 1189949,
          "nameStringIndex": 3484,
          "typeStringIndex": 12,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "9c0d0c001e0004000000"
        }
      ],
      "tailRaw": "0f000000a5020100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a5029f0d27001e000400000000000000a00d27001e0004000000640000000100a50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a50c9f0d27001e000400000000000000a00d27001e00040000006400000001009d020100010100019d0d01000053005300300000001e00030000009e0d51001e00020000009d029f0d27001e000400000000000000a00d27001e0004000000640000000100c409010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000c4099f0d27001e000400000000000000a00d27001e000400000064000000010077010100010100019d0d01000053005300300000001e00030000009e0d51001e000200000077019f0d27001e000400000000000000a00d27001e0004000000640000000100ec000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000ec009f0d27001e000400000000000000a00d27001e0004000000640000000100b60c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b60c9f0d27001e000400000000000000a00d27001e0004000000640000000100d2000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000d2009f0d27001e000400000000000000a00d27001e0004000000640000000100fb09010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000fb099f0d27001e000400000000000000a00d27001e000400000064000000010041040100010100019d0d01000053005300300000001e00030000009e0d51001e000200000041049f0d27001e000400000000000000a00d27001e0004000000640000000100b40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b40c9f0d27001e000400000000000000a00d27001e0004000000640000000100a40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a40c9f0d27001e000400000000000000a00d27001e0004000000640000000100b50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b50c9f0d27001e000400000000000000a00d27001e0004000000640000000100490a010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000490a9f0d27001e000400000000000000a00d27001e0004000000640000000100b70c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b70c9f0d27001e000400000000000000a00d27001e0004000000640000000100",
      "nativeReadOffset": 1189963,
      "worldResident": false
    },
    "GetVersion": "Game:2031d400",
    "CreateStat": "Game:2031dd70",
    "ReadAttributes": "Game:2031e700",
    "ReadSaveGame": "Game:2031ead0",
    "OnPostRead": "Game:2031d510",
    "Read": "Game:2031ea60",
    "ReadAttributesV4": "Game:2031e650",
    "ReadAttributesV3": "Game:2031e920",
    "CreateAttributes": "Game:2031e140",
    "PostInitializeProperties": "Game:2031e3c0",
    "Create": "Game:2031d4a0",
    "CreateAttrib": "Game:2031db70",
    "Invalidate": "Game:2031d3f0",
    "DestroyAttributes": "Game:2031e5d0",
    "GetPropertySetType": "Game:2031d410",
    "wrapperBytes": 16,
    "wrapperAllocationTag": 400,
    "map": {
      "constructor": "Game:20327550",
      "nativeOffset": 168,
      "headerBytes": 16,
      "bucketCount": 43,
      "freshCapacity": 51,
      "nodeBytes": 12,
      "nodeAllocationTag": 409,
      "nodeLayout": {
        "keyCString": 0,
        "nativeAttributePointer": 4,
        "next": 8
      },
      "freshCapacityDerivation": "43 requested plus minimum growth8 at old capacity0; source203205f0"
    }
  },
  "mutableWeaponConfigGlobal": {
    "address": "207c1578",
    "fileBacked": false,
    "coldPEBytes": null,
    "storage": "original PE virtual zero-fill, not initialized file bytes",
    "sectionProof": {
      "headerFileOffset": 552,
      "headerBytes": "2e646174610000008ccb03000060790000f0010000607900000000000000000000000000400000c0",
      "virtualBytes": 248716,
      "rva": 7954432,
      "rawBytes": 126976,
      "rawFileOffset": 7954432
    },
    "liveValueKnown": false,
    "consumers": [
      {
        "function": "Game:2031e440",
        "instruction": {
          "address": "2031e490",
          "bytes": "a178157c20",
          "assembly": "MOV EAX,[0x207c1578]"
        }
      },
      {
        "function": "Game:2031e9c0",
        "instruction": {
          "address": "2031ea10",
          "bytes": "a178157c20",
          "assembly": "MOV EAX,[0x207c1578]"
        }
      },
      {
        "function": "Game:20320a30",
        "instruction": {
          "address": "20320a30",
          "bytes": "a178157c20",
          "assembly": "MOV EAX,[0x207c1578]"
        }
      }
    ]
  },
  "originalNestedRecord": {
    "name": "gCPlayerMemory_PS",
    "version": 5,
    "properties": [
      {
        "name": "HideTips",
        "type": "bool",
        "raw": "00",
        "status": "decoded",
        "kind": "boolean",
        "value": false,
        "serialization": {
          "offset": 1189512,
          "sourceOffset": 1189512,
          "recordOffset": 1189502,
          "recordSourceOffset": 1189502,
          "nameStringIndex": 3460,
          "typeStringIndex": 16,
          "magic": 30,
          "byteLength": 1,
          "inlineStrings": false,
          "recordHeaderRaw": "840d10001e0001000000"
        },
        "byteLength": 1
      },
      {
        "name": "PlayerKnows",
        "type": "bTObjArray<class bCString>",
        "raw": "0100000000",
        "status": "decoded",
        "kind": "array",
        "value": {
          "prefix": 1,
          "elementType": "class bCString",
          "count": 0,
          "items": []
        },
        "serialization": {
          "offset": 1189523,
          "sourceOffset": 1189523,
          "recordOffset": 1189513,
          "recordSourceOffset": 1189513,
          "nameStringIndex": 3461,
          "typeStringIndex": 139,
          "magic": 30,
          "byteLength": 5,
          "inlineStrings": false,
          "recordHeaderRaw": "850d8b001e0005000000"
        },
        "byteLength": 5
      },
      {
        "name": "PoliticalFame",
        "type": "bTValArray<long>",
        "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "status": "decoded",
        "kind": "array",
        "value": {
          "prefix": 1,
          "elementType": "long",
          "count": 9,
          "items": [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ]
        },
        "serialization": {
          "offset": 1189538,
          "sourceOffset": 1189538,
          "recordOffset": 1189528,
          "recordSourceOffset": 1189528,
          "nameStringIndex": 3462,
          "typeStringIndex": 159,
          "magic": 30,
          "byteLength": 41,
          "inlineStrings": false,
          "recordHeaderRaw": "860d9f001e0029000000"
        },
        "byteLength": 41
      },
      {
        "name": "PoliticalSuspectComment",
        "type": "bTValArray<long>",
        "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "status": "decoded",
        "kind": "array",
        "value": {
          "prefix": 1,
          "elementType": "long",
          "count": 9,
          "items": [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ]
        },
        "serialization": {
          "offset": 1189589,
          "sourceOffset": 1189589,
          "recordOffset": 1189579,
          "recordSourceOffset": 1189579,
          "nameStringIndex": 3463,
          "typeStringIndex": 159,
          "magic": 30,
          "byteLength": 41,
          "inlineStrings": false,
          "recordHeaderRaw": "870d9f001e0029000000"
        },
        "byteLength": 41
      },
      {
        "name": "PoliticalCrimeCount",
        "type": "bTValArray<long>",
        "raw": "0109000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "status": "decoded",
        "kind": "array",
        "value": {
          "prefix": 1,
          "elementType": "long",
          "count": 9,
          "items": [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ]
        },
        "serialization": {
          "offset": 1189640,
          "sourceOffset": 1189640,
          "recordOffset": 1189630,
          "recordSourceOffset": 1189630,
          "nameStringIndex": 3464,
          "typeStringIndex": 159,
          "magic": 30,
          "byteLength": 41,
          "inlineStrings": false,
          "recordHeaderRaw": "880d9f001e0029000000"
        },
        "byteLength": 41
      },
      {
        "name": "PoliticalPlayerCrime",
        "type": "bTValArray<bool>",
        "raw": "0109000000000000000000000000",
        "status": "decoded",
        "kind": "array",
        "value": {
          "prefix": 1,
          "elementType": "bool",
          "count": 9,
          "items": [
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false
          ]
        },
        "serialization": {
          "offset": 1189691,
          "sourceOffset": 1189691,
          "recordOffset": 1189681,
          "recordSourceOffset": 1189681,
          "nameStringIndex": 3465,
          "typeStringIndex": 3466,
          "magic": 30,
          "byteLength": 14,
          "inlineStrings": false,
          "recordHeaderRaw": "890d8a0d1e000e000000"
        },
        "byteLength": 14
      },
      {
        "name": "XP",
        "type": "long",
        "raw": "00000000",
        "status": "decoded",
        "kind": "integer",
        "value": 0,
        "serialization": {
          "offset": 1189715,
          "sourceOffset": 1189715,
          "recordOffset": 1189705,
          "recordSourceOffset": 1189705,
          "nameStringIndex": 3467,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "8b0d1c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "LPAttribs",
        "type": "long",
        "raw": "00000000",
        "status": "decoded",
        "kind": "integer",
        "value": 0,
        "serialization": {
          "offset": 1189729,
          "sourceOffset": 1189729,
          "recordOffset": 1189719,
          "recordSourceOffset": 1189719,
          "nameStringIndex": 3468,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "8c0d1c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "LPPerks",
        "type": "long",
        "raw": "00000000",
        "status": "decoded",
        "kind": "integer",
        "value": 0,
        "serialization": {
          "offset": 1189743,
          "sourceOffset": 1189743,
          "recordOffset": 1189733,
          "recordSourceOffset": 1189733,
          "nameStringIndex": 3469,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "8d0d1c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "SecondsTransformRemain",
        "type": "float",
        "raw": "00000000",
        "status": "decoded",
        "kind": "float32",
        "value": 0.0,
        "serialization": {
          "offset": 1189757,
          "sourceOffset": 1189757,
          "recordOffset": 1189747,
          "recordSourceOffset": 1189747,
          "nameStringIndex": 3470,
          "typeStringIndex": 12,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "8e0d0c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "SecondsMistRemain",
        "type": "float",
        "raw": "00000000",
        "status": "decoded",
        "kind": "float32",
        "value": 0.0,
        "serialization": {
          "offset": 1189771,
          "sourceOffset": 1189771,
          "recordOffset": 1189761,
          "recordSourceOffset": 1189761,
          "nameStringIndex": 3471,
          "typeStringIndex": 12,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "8f0d0c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "LastWeaponConfig",
        "type": "bTPropertyContainer<enum gEWeaponConfig>",
        "raw": "010000000000",
        "status": "decoded",
        "kind": "enum",
        "value": {
          "enum": "gEWeaponConfig",
          "version": 1,
          "value": 0,
          "symbol": "gEWeaponConfig_Melee",
          "symbols": [
            "gEWeaponConfig_Melee"
          ]
        },
        "serialization": {
          "offset": 1189785,
          "sourceOffset": 1189785,
          "recordOffset": 1189775,
          "recordSourceOffset": 1189775,
          "nameStringIndex": 3472,
          "typeStringIndex": 3473,
          "magic": 30,
          "byteLength": 6,
          "inlineStrings": false,
          "recordHeaderRaw": "900d910d1e0006000000"
        },
        "byteLength": 6
      },
      {
        "name": "LastSpell",
        "type": "bCPropertyID",
        "raw": "e3f3194ca998c64faeaf3e865599e60c00000000",
        "status": "decoded",
        "kind": "guid20",
        "value": {
          "rawGuid20": "e3f3194ca998c64faeaf3e865599e60c00000000",
          "referenceKind": "unspecified"
        },
        "serialization": {
          "offset": 1189801,
          "sourceOffset": 1189801,
          "recordOffset": 1189791,
          "recordSourceOffset": 1189791,
          "nameStringIndex": 3100,
          "typeStringIndex": 3002,
          "magic": 30,
          "byteLength": 20,
          "inlineStrings": false,
          "recordHeaderRaw": "1c0cba0b1e0014000000"
        },
        "byteLength": 20
      },
      {
        "name": "BookOfFlood",
        "type": "long",
        "raw": "00000000",
        "status": "decoded",
        "kind": "integer",
        "value": 0,
        "serialization": {
          "offset": 1189831,
          "sourceOffset": 1189831,
          "recordOffset": 1189821,
          "recordSourceOffset": 1189821,
          "nameStringIndex": 3474,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "920d1c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "BookOfRhobar",
        "type": "long",
        "raw": "00000000",
        "status": "decoded",
        "kind": "integer",
        "value": 0,
        "serialization": {
          "offset": 1189845,
          "sourceOffset": 1189845,
          "recordOffset": 1189835,
          "recordSourceOffset": 1189835,
          "nameStringIndex": 3475,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "930d1c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "BookOfZuben",
        "type": "long",
        "raw": "00000000",
        "status": "decoded",
        "kind": "integer",
        "value": 0,
        "serialization": {
          "offset": 1189859,
          "sourceOffset": 1189859,
          "recordOffset": 1189849,
          "recordSourceOffset": 1189849,
          "nameStringIndex": 3476,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "940d1c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "DuskToDawnStartHour",
        "type": "long",
        "raw": "00000000",
        "status": "decoded",
        "kind": "integer",
        "value": 0,
        "serialization": {
          "offset": 1189873,
          "sourceOffset": 1189873,
          "recordOffset": 1189863,
          "recordSourceOffset": 1189863,
          "nameStringIndex": 3477,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "950d1c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "Chapter",
        "type": "long",
        "raw": "00000000",
        "status": "decoded",
        "kind": "integer",
        "value": 0,
        "serialization": {
          "offset": 1189887,
          "sourceOffset": 1189887,
          "recordOffset": 1189877,
          "recordSourceOffset": 1189877,
          "nameStringIndex": 3478,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "960d1c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "TutorialFlags",
        "type": "long",
        "raw": "00000000",
        "status": "decoded",
        "kind": "integer",
        "value": 0,
        "serialization": {
          "offset": 1189901,
          "sourceOffset": 1189901,
          "recordOffset": 1189891,
          "recordSourceOffset": 1189891,
          "nameStringIndex": 3479,
          "typeStringIndex": 28,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "970d1c001e0004000000"
        },
        "byteLength": 4
      },
      {
        "name": "TalkedToDiego",
        "type": "bool",
        "raw": "00",
        "status": "decoded",
        "kind": "boolean",
        "value": false,
        "serialization": {
          "offset": 1189915,
          "sourceOffset": 1189915,
          "recordOffset": 1189905,
          "recordSourceOffset": 1189905,
          "nameStringIndex": 3480,
          "typeStringIndex": 16,
          "magic": 30,
          "byteLength": 1,
          "inlineStrings": false,
          "recordHeaderRaw": "980d10001e0001000000"
        },
        "byteLength": 1
      },
      {
        "name": "TalkedToGorn",
        "type": "bool",
        "raw": "00",
        "status": "decoded",
        "kind": "boolean",
        "value": false,
        "serialization": {
          "offset": 1189926,
          "sourceOffset": 1189926,
          "recordOffset": 1189916,
          "recordSourceOffset": 1189916,
          "nameStringIndex": 3481,
          "typeStringIndex": 16,
          "magic": 30,
          "byteLength": 1,
          "inlineStrings": false,
          "recordHeaderRaw": "990d10001e0001000000"
        },
        "byteLength": 1
      },
      {
        "name": "TalkedToMilten",
        "type": "bool",
        "raw": "00",
        "status": "decoded",
        "kind": "boolean",
        "value": false,
        "serialization": {
          "offset": 1189937,
          "sourceOffset": 1189937,
          "recordOffset": 1189927,
          "recordSourceOffset": 1189927,
          "nameStringIndex": 3482,
          "typeStringIndex": 16,
          "magic": 30,
          "byteLength": 1,
          "inlineStrings": false,
          "recordHeaderRaw": "9a0d10001e0001000000"
        },
        "byteLength": 1
      },
      {
        "name": "TalkedToLester",
        "type": "bool",
        "raw": "00",
        "status": "decoded",
        "kind": "boolean",
        "value": false,
        "serialization": {
          "offset": 1189948,
          "sourceOffset": 1189948,
          "recordOffset": 1189938,
          "recordSourceOffset": 1189938,
          "nameStringIndex": 3483,
          "typeStringIndex": 16,
          "magic": 30,
          "byteLength": 1,
          "inlineStrings": false,
          "recordHeaderRaw": "9b0d10001e0001000000"
        },
        "byteLength": 1
      },
      {
        "name": "TimeStampStart",
        "type": "float",
        "raw": "00000000",
        "status": "decoded",
        "kind": "float32",
        "value": 0.0,
        "serialization": {
          "offset": 1189959,
          "sourceOffset": 1189959,
          "recordOffset": 1189949,
          "recordSourceOffset": 1189949,
          "nameStringIndex": 3484,
          "typeStringIndex": 12,
          "magic": 30,
          "byteLength": 4,
          "inlineStrings": false,
          "recordHeaderRaw": "9c0d0c001e0004000000"
        },
        "byteLength": 4
      }
    ],
    "tail": {
      "raw": "0f000000a5020100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a5029f0d27001e000400000000000000a00d27001e0004000000640000000100a50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a50c9f0d27001e000400000000000000a00d27001e00040000006400000001009d020100010100019d0d01000053005300300000001e00030000009e0d51001e00020000009d029f0d27001e000400000000000000a00d27001e0004000000640000000100c409010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000c4099f0d27001e000400000000000000a00d27001e000400000064000000010077010100010100019d0d01000053005300300000001e00030000009e0d51001e000200000077019f0d27001e000400000000000000a00d27001e0004000000640000000100ec000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000ec009f0d27001e000400000000000000a00d27001e0004000000640000000100b60c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b60c9f0d27001e000400000000000000a00d27001e0004000000640000000100d2000100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000d2009f0d27001e000400000000000000a00d27001e0004000000640000000100fb09010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000fb099f0d27001e000400000000000000a00d27001e000400000064000000010041040100010100019d0d01000053005300300000001e00030000009e0d51001e000200000041049f0d27001e000400000000000000a00d27001e0004000000640000000100b40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b40c9f0d27001e000400000000000000a00d27001e0004000000640000000100a40c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000a40c9f0d27001e000400000000000000a00d27001e0004000000640000000100b50c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b50c9f0d27001e000400000000000000a00d27001e0004000000640000000100490a010001010001a10d010000530053004c0000001e0005000000a20d27001e000400000064000000a30d27001e0004000000000000009e0d51001e0002000000490a9f0d27001e000400000000000000a00d27001e0004000000640000000100b70c0100010100019d0d01000053005300300000001e00030000009e0d51001e0002000000b70c9f0d27001e000400000000000000a00d27001e0004000000640000000100",
      "byteLength": 1123,
      "status": "decoded",
      "value": {
        "attributeCount": 15,
        "attributes": [
          {
            "key": "ALC",
            "keyStringIndex": 677,
            "offset": 4,
            "sourceOffset": 1189969,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "a502",
                  "status": "decoded",
                  "kind": "string",
                  "value": "ALC",
                  "serialization": {
                    "offset": 41,
                    "sourceOffset": 1190006,
                    "recordOffset": 31,
                    "recordSourceOffset": 1189996,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 53,
                    "sourceOffset": 1190018,
                    "recordOffset": 43,
                    "recordSourceOffset": 1190008,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 67,
                    "sourceOffset": 1190032,
                    "recordOffset": 57,
                    "recordSourceOffset": 1190022,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 73,
                "sourceOffset": 1190038
              },
              "serialization": {
                "offset": 6,
                "sourceOffset": 1189971,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 73,
                "tailSourceOffset": 1190038,
                "endOffset": 73,
                "endSourceOffset": 1190038
              }
            }
          },
          {
            "key": "PROT_MISSILE",
            "keyStringIndex": 3237,
            "offset": 73,
            "sourceOffset": 1190038,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "a50c",
                  "status": "decoded",
                  "kind": "string",
                  "value": "PROT_MISSILE",
                  "serialization": {
                    "offset": 110,
                    "sourceOffset": 1190075,
                    "recordOffset": 100,
                    "recordSourceOffset": 1190065,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 122,
                    "sourceOffset": 1190087,
                    "recordOffset": 112,
                    "recordSourceOffset": 1190077,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 136,
                    "sourceOffset": 1190101,
                    "recordOffset": 126,
                    "recordSourceOffset": 1190091,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 142,
                "sourceOffset": 1190107
              },
              "serialization": {
                "offset": 75,
                "sourceOffset": 1190040,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 142,
                "tailSourceOffset": 1190107,
                "endOffset": 142,
                "endSourceOffset": 1190107
              }
            }
          },
          {
            "key": "SMT",
            "keyStringIndex": 669,
            "offset": 142,
            "sourceOffset": 1190107,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "9d02",
                  "status": "decoded",
                  "kind": "string",
                  "value": "SMT",
                  "serialization": {
                    "offset": 179,
                    "sourceOffset": 1190144,
                    "recordOffset": 169,
                    "recordSourceOffset": 1190134,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 191,
                    "sourceOffset": 1190156,
                    "recordOffset": 181,
                    "recordSourceOffset": 1190146,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 205,
                    "sourceOffset": 1190170,
                    "recordOffset": 195,
                    "recordSourceOffset": 1190160,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 211,
                "sourceOffset": 1190176
              },
              "serialization": {
                "offset": 144,
                "sourceOffset": 1190109,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 211,
                "tailSourceOffset": 1190176,
                "endOffset": 211,
                "endSourceOffset": 1190176
              }
            }
          },
          {
            "key": "HP",
            "keyStringIndex": 2500,
            "offset": 211,
            "sourceOffset": 1190176,
            "record": {
              "name": "gCStat",
              "version": 1,
              "properties": [
                {
                  "name": "BaseMaximum",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 248,
                    "sourceOffset": 1190213,
                    "recordOffset": 238,
                    "recordSourceOffset": 1190203,
                    "nameStringIndex": 3490,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a20d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "MaximumModifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 262,
                    "sourceOffset": 1190227,
                    "recordOffset": 252,
                    "recordSourceOffset": 1190217,
                    "nameStringIndex": 3491,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a30d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "c409",
                  "status": "decoded",
                  "kind": "string",
                  "value": "HP",
                  "serialization": {
                    "offset": 276,
                    "sourceOffset": 1190241,
                    "recordOffset": 266,
                    "recordSourceOffset": 1190231,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 288,
                    "sourceOffset": 1190253,
                    "recordOffset": 278,
                    "recordSourceOffset": 1190243,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 302,
                    "sourceOffset": 1190267,
                    "recordOffset": 292,
                    "recordSourceOffset": 1190257,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 308,
                "sourceOffset": 1190273
              },
              "serialization": {
                "offset": 213,
                "sourceOffset": 1190178,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 76,
                "propertyVersion": 30,
                "propertyCount": 5,
                "headerRaw": "010001010001a10d010000530053004c0000001e0005000000",
                "tailOffset": 308,
                "tailSourceOffset": 1190273,
                "endOffset": 308,
                "endSourceOffset": 1190273
              }
            }
          },
          {
            "key": "DEX",
            "keyStringIndex": 375,
            "offset": 308,
            "sourceOffset": 1190273,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "7701",
                  "status": "decoded",
                  "kind": "string",
                  "value": "DEX",
                  "serialization": {
                    "offset": 345,
                    "sourceOffset": 1190310,
                    "recordOffset": 335,
                    "recordSourceOffset": 1190300,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 357,
                    "sourceOffset": 1190322,
                    "recordOffset": 347,
                    "recordSourceOffset": 1190312,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 371,
                    "sourceOffset": 1190336,
                    "recordOffset": 361,
                    "recordSourceOffset": 1190326,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 377,
                "sourceOffset": 1190342
              },
              "serialization": {
                "offset": 310,
                "sourceOffset": 1190275,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 377,
                "tailSourceOffset": 1190342,
                "endOffset": 377,
                "endSourceOffset": 1190342
              }
            }
          },
          {
            "key": "THF",
            "keyStringIndex": 236,
            "offset": 377,
            "sourceOffset": 1190342,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "ec00",
                  "status": "decoded",
                  "kind": "string",
                  "value": "THF",
                  "serialization": {
                    "offset": 414,
                    "sourceOffset": 1190379,
                    "recordOffset": 404,
                    "recordSourceOffset": 1190369,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 426,
                    "sourceOffset": 1190391,
                    "recordOffset": 416,
                    "recordSourceOffset": 1190381,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 440,
                    "sourceOffset": 1190405,
                    "recordOffset": 430,
                    "recordSourceOffset": 1190395,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 446,
                "sourceOffset": 1190411
              },
              "serialization": {
                "offset": 379,
                "sourceOffset": 1190344,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 446,
                "tailSourceOffset": 1190411,
                "endOffset": 446,
                "endSourceOffset": 1190411
              }
            }
          },
          {
            "key": "PROT_ICE",
            "keyStringIndex": 3254,
            "offset": 446,
            "sourceOffset": 1190411,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "b60c",
                  "status": "decoded",
                  "kind": "string",
                  "value": "PROT_ICE",
                  "serialization": {
                    "offset": 483,
                    "sourceOffset": 1190448,
                    "recordOffset": 473,
                    "recordSourceOffset": 1190438,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 495,
                    "sourceOffset": 1190460,
                    "recordOffset": 485,
                    "recordSourceOffset": 1190450,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 509,
                    "sourceOffset": 1190474,
                    "recordOffset": 499,
                    "recordSourceOffset": 1190464,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 515,
                "sourceOffset": 1190480
              },
              "serialization": {
                "offset": 448,
                "sourceOffset": 1190413,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 515,
                "tailSourceOffset": 1190480,
                "endOffset": 515,
                "endSourceOffset": 1190480
              }
            }
          },
          {
            "key": "STR",
            "keyStringIndex": 210,
            "offset": 515,
            "sourceOffset": 1190480,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "d200",
                  "status": "decoded",
                  "kind": "string",
                  "value": "STR",
                  "serialization": {
                    "offset": 552,
                    "sourceOffset": 1190517,
                    "recordOffset": 542,
                    "recordSourceOffset": 1190507,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 564,
                    "sourceOffset": 1190529,
                    "recordOffset": 554,
                    "recordSourceOffset": 1190519,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 578,
                    "sourceOffset": 1190543,
                    "recordOffset": 568,
                    "recordSourceOffset": 1190533,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 584,
                "sourceOffset": 1190549
              },
              "serialization": {
                "offset": 517,
                "sourceOffset": 1190482,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 584,
                "tailSourceOffset": 1190549,
                "endOffset": 584,
                "endSourceOffset": 1190549
              }
            }
          },
          {
            "key": "SP",
            "keyStringIndex": 2555,
            "offset": 584,
            "sourceOffset": 1190549,
            "record": {
              "name": "gCStat",
              "version": 1,
              "properties": [
                {
                  "name": "BaseMaximum",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 621,
                    "sourceOffset": 1190586,
                    "recordOffset": 611,
                    "recordSourceOffset": 1190576,
                    "nameStringIndex": 3490,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a20d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "MaximumModifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 635,
                    "sourceOffset": 1190600,
                    "recordOffset": 625,
                    "recordSourceOffset": 1190590,
                    "nameStringIndex": 3491,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a30d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "fb09",
                  "status": "decoded",
                  "kind": "string",
                  "value": "SP",
                  "serialization": {
                    "offset": 649,
                    "sourceOffset": 1190614,
                    "recordOffset": 639,
                    "recordSourceOffset": 1190604,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 661,
                    "sourceOffset": 1190626,
                    "recordOffset": 651,
                    "recordSourceOffset": 1190616,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 675,
                    "sourceOffset": 1190640,
                    "recordOffset": 665,
                    "recordSourceOffset": 1190630,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 681,
                "sourceOffset": 1190646
              },
              "serialization": {
                "offset": 586,
                "sourceOffset": 1190551,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 76,
                "propertyVersion": 30,
                "propertyCount": 5,
                "headerRaw": "010001010001a10d010000530053004c0000001e0005000000",
                "tailOffset": 681,
                "tailSourceOffset": 1190646,
                "endOffset": 681,
                "endSourceOffset": 1190646
              }
            }
          },
          {
            "key": "INT",
            "keyStringIndex": 1089,
            "offset": 681,
            "sourceOffset": 1190646,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "4104",
                  "status": "decoded",
                  "kind": "string",
                  "value": "INT",
                  "serialization": {
                    "offset": 718,
                    "sourceOffset": 1190683,
                    "recordOffset": 708,
                    "recordSourceOffset": 1190673,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 730,
                    "sourceOffset": 1190695,
                    "recordOffset": 720,
                    "recordSourceOffset": 1190685,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 744,
                    "sourceOffset": 1190709,
                    "recordOffset": 734,
                    "recordSourceOffset": 1190699,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 750,
                "sourceOffset": 1190715
              },
              "serialization": {
                "offset": 683,
                "sourceOffset": 1190648,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 750,
                "tailSourceOffset": 1190715,
                "endOffset": 750,
                "endSourceOffset": 1190715
              }
            }
          },
          {
            "key": "PROT_IMPACT",
            "keyStringIndex": 3252,
            "offset": 750,
            "sourceOffset": 1190715,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "b40c",
                  "status": "decoded",
                  "kind": "string",
                  "value": "PROT_IMPACT",
                  "serialization": {
                    "offset": 787,
                    "sourceOffset": 1190752,
                    "recordOffset": 777,
                    "recordSourceOffset": 1190742,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 799,
                    "sourceOffset": 1190764,
                    "recordOffset": 789,
                    "recordSourceOffset": 1190754,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 813,
                    "sourceOffset": 1190778,
                    "recordOffset": 803,
                    "recordSourceOffset": 1190768,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 819,
                "sourceOffset": 1190784
              },
              "serialization": {
                "offset": 752,
                "sourceOffset": 1190717,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 819,
                "tailSourceOffset": 1190784,
                "endOffset": 819,
                "endSourceOffset": 1190784
              }
            }
          },
          {
            "key": "PROT_BLADE",
            "keyStringIndex": 3236,
            "offset": 819,
            "sourceOffset": 1190784,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "a40c",
                  "status": "decoded",
                  "kind": "string",
                  "value": "PROT_BLADE",
                  "serialization": {
                    "offset": 856,
                    "sourceOffset": 1190821,
                    "recordOffset": 846,
                    "recordSourceOffset": 1190811,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 868,
                    "sourceOffset": 1190833,
                    "recordOffset": 858,
                    "recordSourceOffset": 1190823,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 882,
                    "sourceOffset": 1190847,
                    "recordOffset": 872,
                    "recordSourceOffset": 1190837,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 888,
                "sourceOffset": 1190853
              },
              "serialization": {
                "offset": 821,
                "sourceOffset": 1190786,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 888,
                "tailSourceOffset": 1190853,
                "endOffset": 888,
                "endSourceOffset": 1190853
              }
            }
          },
          {
            "key": "PROT_FIRE",
            "keyStringIndex": 3253,
            "offset": 888,
            "sourceOffset": 1190853,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "b50c",
                  "status": "decoded",
                  "kind": "string",
                  "value": "PROT_FIRE",
                  "serialization": {
                    "offset": 925,
                    "sourceOffset": 1190890,
                    "recordOffset": 915,
                    "recordSourceOffset": 1190880,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 937,
                    "sourceOffset": 1190902,
                    "recordOffset": 927,
                    "recordSourceOffset": 1190892,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 951,
                    "sourceOffset": 1190916,
                    "recordOffset": 941,
                    "recordSourceOffset": 1190906,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 957,
                "sourceOffset": 1190922
              },
              "serialization": {
                "offset": 890,
                "sourceOffset": 1190855,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 957,
                "tailSourceOffset": 1190922,
                "endOffset": 957,
                "endSourceOffset": 1190922
              }
            }
          },
          {
            "key": "MP",
            "keyStringIndex": 2633,
            "offset": 957,
            "sourceOffset": 1190922,
            "record": {
              "name": "gCStat",
              "version": 1,
              "properties": [
                {
                  "name": "BaseMaximum",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 994,
                    "sourceOffset": 1190959,
                    "recordOffset": 984,
                    "recordSourceOffset": 1190949,
                    "nameStringIndex": 3490,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a20d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "MaximumModifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 1008,
                    "sourceOffset": 1190973,
                    "recordOffset": 998,
                    "recordSourceOffset": 1190963,
                    "nameStringIndex": 3491,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a30d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "490a",
                  "status": "decoded",
                  "kind": "string",
                  "value": "MP",
                  "serialization": {
                    "offset": 1022,
                    "sourceOffset": 1190987,
                    "recordOffset": 1012,
                    "recordSourceOffset": 1190977,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 1034,
                    "sourceOffset": 1190999,
                    "recordOffset": 1024,
                    "recordSourceOffset": 1190989,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 1048,
                    "sourceOffset": 1191013,
                    "recordOffset": 1038,
                    "recordSourceOffset": 1191003,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 1054,
                "sourceOffset": 1191019
              },
              "serialization": {
                "offset": 959,
                "sourceOffset": 1190924,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 76,
                "propertyVersion": 30,
                "propertyCount": 5,
                "headerRaw": "010001010001a10d010000530053004c0000001e0005000000",
                "tailOffset": 1054,
                "tailSourceOffset": 1191019,
                "endOffset": 1054,
                "endSourceOffset": 1191019
              }
            }
          },
          {
            "key": "PROT_LIGHTNING",
            "keyStringIndex": 3255,
            "offset": 1054,
            "sourceOffset": 1191019,
            "record": {
              "name": "gCAttribute",
              "version": 1,
              "properties": [
                {
                  "name": "Tag",
                  "type": "bCString",
                  "raw": "b70c",
                  "status": "decoded",
                  "kind": "string",
                  "value": "PROT_LIGHTNING",
                  "serialization": {
                    "offset": 1091,
                    "sourceOffset": 1191056,
                    "recordOffset": 1081,
                    "recordSourceOffset": 1191046,
                    "nameStringIndex": 3486,
                    "typeStringIndex": 81,
                    "magic": 30,
                    "byteLength": 2,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9e0d51001e0002000000"
                  },
                  "byteLength": 2
                },
                {
                  "name": "Modifier",
                  "type": "int",
                  "raw": "00000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 0,
                  "serialization": {
                    "offset": 1103,
                    "sourceOffset": 1191068,
                    "recordOffset": 1093,
                    "recordSourceOffset": 1191058,
                    "nameStringIndex": 3487,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "9f0d27001e0004000000"
                  },
                  "byteLength": 4
                },
                {
                  "name": "Value",
                  "type": "int",
                  "raw": "64000000",
                  "status": "decoded",
                  "kind": "integer",
                  "value": 100,
                  "serialization": {
                    "offset": 1117,
                    "sourceOffset": 1191082,
                    "recordOffset": 1107,
                    "recordSourceOffset": 1191072,
                    "nameStringIndex": 3488,
                    "typeStringIndex": 39,
                    "magic": 30,
                    "byteLength": 4,
                    "inlineStrings": false,
                    "recordHeaderRaw": "a00d27001e0004000000"
                  },
                  "byteLength": 4
                }
              ],
              "tail": {
                "raw": "",
                "byteLength": 0,
                "status": "empty",
                "value": null,
                "offset": 1123,
                "sourceOffset": 1191088
              },
              "serialization": {
                "offset": 1056,
                "sourceOffset": 1191021,
                "inlineStrings": false,
                "typeToVersionFillerRaw": "0100005300",
                "objectVersion": 83,
                "objectSize": 48,
                "propertyVersion": 30,
                "propertyCount": 3,
                "headerRaw": "0100010100019d0d01000053005300300000001e0003000000",
                "tailOffset": 1123,
                "tailSourceOffset": 1191088,
                "endOffset": 1123,
                "endSourceOffset": 1191088
              }
            }
          }
        ]
      },
      "offset": 1189965,
      "sourceOffset": 1189965
    },
    "serialization": {
      "offset": 1189475,
      "sourceOffset": 1189475,
      "inlineStrings": false,
      "outerVersion": 5,
      "typeToVersionFillerRaw": "0100005300",
      "objectVersion": 83,
      "objectSize": 1592,
      "propertyVersion": 30,
      "propertyCount": 24,
      "headerRaw": "0500010001010001830d01000053005300380600001e0018000000",
      "tailOffset": 1189965,
      "tailSourceOffset": 1189965,
      "endOffset": 1191088,
      "endSourceOffset": 1191088
    }
  },
  "profile": {
    "worldResident": false,
    "detached": true,
    "freshSuccessfulAllocation": true,
    "numericNativePointersMasked": true,
    "nativeCodeExecuted": false,
    "serializedFieldOmission": "registered IsConsumingItem preserves actual native default false",
    "frontendRequiredServices": [
      "real memory/reallocation and map-node ownership",
      "actual CString/header/refcount read, copy, hash and destroy",
      "actual PropertyID random generator",
      "current mutable WeaponConfig global",
      "actual localization/GetText/log callbacks",
      "native/wrapper/creator/accessor reference boundaries and terminal destruction"
    ],
    "sharedConsumers": "startup, HUD and combat must retain this same map and actual NativeAttribute objects",
    "orderedRead": "construct and PostInitialize defaults; reflected stored fields; destroy original attributes; source map/read/node/reference/log operations; CreateAttributes fallback; enclosing OnPostRead later"
  }
}
`;function yo(e,t){if(e===null){if(t!==void 0)throw Error(`NULL CString cannot supply a separate byte mask`);return 0}if(t!==void 0&&t.length!==e.length)throw Error(`CString hash requires the same physical byte and mask extent`);let n=0;for(let r=0;r<e.length;r++){if(t!==void 0&&t[r]!==255)throw Error(`CString hash reached an unknown original byte`);let i=e[r];if(i===0)return n;let a=i<128?i:i-256;n=Math.imul(n,33)+a>>>0}throw Error(`CString hash requires its actual terminating NUL byte`)}var z=JSON.parse(vo);if(z.schema!==`gothic3-player-memory-reading-rules-v1`||z.nativeBytes!==184||z.propertyType!==60||z.nativeVersion!==5||z.nativeObjectVersion!==6||z.allocationTag!==196||z.fields.length!==25||z.wrapperVtable!==`20697d2c`||!z.sources||z.sources.clone!==`Game:20328880`||z.sources.create!==`Game:2031d4a0`||z.sources.wrapperRead!==`Game:20320970`||z.sources.dataRead!==`Game:20328200`||z.fields.map(e=>e.name).join(`,`)!==`HideTips,PlayerKnows,PoliticalFame,PoliticalSuspectComment,PoliticalCrimeCount,PoliticalPlayerCrime,XP,LPAttribs,LPPerks,SecondsTransformRemain,SecondsMistRemain,LastWeaponConfig,LastSpell,BookOfFlood,BookOfRhobar,BookOfZuben,DuskToDawnStartHour,Chapter,TutorialFlags,TalkedToDiego,TalkedToGorn,TalkedToMilten,TalkedToLester,TimeStampStart,IsConsumingItem`||z.fields.map(e=>e.nativeOffset).join(`,`)!==`20,24,36,48,60,72,84,88,92,124,128,96,104,132,136,140,144,148,152,156,157,158,159,160,164`||z.inputs.Game!==`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`||z.inputs.Engine!==`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`||z.inputs.SharedBase!==`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`)throw Error(`Original PlayerMemory reading evidence differs`);var bo=e=>({known:!0,value:e}),xo=e=>({known:!1,reason:e}),So=Symbol(`actual PlayerMemory native operation`);function Co(e,t){if(!e.known)throw Error(t+`: `+e.reason);return e.value}function wo(e,t=4294967295){if(!Number.isInteger(e)||e<0||e>t)throw Error(`Actual original unsigned PlayerMemory value required`);return e}function To(e,t,n){if(e===null)throw Error(n+`: native NULL allocation/fatal or dereference branch is unresolved`);if(!e.identity||e.freed||e.bytes.length!==t||e.knownMask.length!==t)throw Error(n+`: actual allocation extent required`);return e}function Eo(e){return[...e].map(e=>e.toString(16).padStart(2,`0`)).join(``)}var Do=class{backing;nativeOffset;reader;current=null;destroyed=!1;constructor(e,t,n){this.backing=e,this.nativeOffset=t,this.reader=n,this.constructNull()}constructNull(){if(this.reader.guard(),this.current!==null&&!this.destroyed)throw Error(`CString construction requires fresh/ended slot`);this.current=null,this.destroyed=!1,this.backing.bytes.fill(0,this.nativeOffset,this.nativeOffset+4),this.backing.knownMask.fill(255,this.nativeOffset,this.nativeOffset+4)}get pointer(){if(this.destroyed)throw Error(`Ended original CString object lifetime`);return this.current}set pointer(e){if(this.reader.guard(),this.destroyed)throw Error(`Ended original CString object lifetime`);e!==null&&this.valid(e),this.current=e,e===null?this.constructNull():this.backing.knownMask.fill(0,this.nativeOffset,this.nativeOffset+4),this.reader.note(`captured CString pointer assignment`,`SharedBase:1001ee90`)}valid(e){if(e.freed||!e.identity||e.length!==e.text.length||!Number.isInteger(e.length)||e.length<0||!Number.isInteger(e.referenceCount)||e.referenceCount<0||e.referenceCount>65535||!(e.characterBytes instanceof Uint8Array)||e.characterBytes.length<e.length+1||e.characterKnownMask.length!==e.characterBytes.length)throw Error(`Actual live CString character allocation required`)}get text(){let e=this.pointer;return e===null?``:(this.valid(e),e.text)}hash(){let e=this.pointer;return e===null?yo(null):(this.valid(e),yo(e.characterBytes,e.characterKnownMask))}equals(e){let t=this.pointer,n=e.pointer;if(t===null)return n===null;if(n===null||(this.valid(t),this.valid(n),t.length!==n.length))return!1;for(let e=0;e<=t.length;e++){if(t.characterKnownMask[e]!==255||n.characterKnownMask[e]!==255)throw Error(`Unknown native CString comparison byte`);let r=t.characterBytes[e];if(r!==n.characterBytes[e])return!1;if(r===0)return!0}throw Error(`Actual CString comparison requires physical terminator`)}relocate(e){this.reader.guard(),this.backing=e}destroy(){if(this.reader.guard(),this.destroyed)throw Error(`CString destructor already ran`);let e=this.current;if(e!==null&&(this.valid(e),e.referenceCount=e.referenceCount-1&65535,this.reader.note(`CString destructor captured ushort reference decrement`,`SharedBase:100060c3`),e.referenceCount===0&&(this.reader.call(`CString destructor MemoryAdmin.Free`,`SharedBase:100060c3`,()=>this.reader.host.freeCString?.(e)),!e.freed)))throw Error(`Actual CString Free must end captured character allocation lifetime`);this.destroyed=!0,this.reader.note(`CString object lifetime ended; original pointer bits retained`,`SharedBase:100060c3`)}},Oo=class{properties;nativeOffset;kind;allocation=null;strings=[];constructor(e,t,n){this.properties=e,this.nativeOffset=t,this.kind=n}get count(){return this.properties.dword(this.nativeOffset+4)|0}set count(e){this.properties.putWord(this.nativeOffset+4,wo(e))}get capacity(){return this.properties.dword(this.nativeOffset+8)|0}set capacity(e){this.properties.putWord(this.nativeOffset+8,wo(e))}get stride(){return this.kind===`bool`?1:4}get items(){let e=[];for(let t=0;t<this.count;t++)e.push(this.get(t));return e}get(e){if(!Number.isInteger(e)||e<0||e>=this.count||this.count>this.capacity||!this.allocation||this.allocation.freed)throw Error(`Actual PlayerMemory array element required`);if(this.kind===`CString`)return this.strings[e].text;let t=e*this.stride;if(!this.allocation.knownMask.subarray(t,t+this.stride).every(e=>e===255))throw Error(`Unknown PlayerMemory array element bytes`);return this.kind===`bool`?this.allocation.bytes[t]!==0:new DataView(this.allocation.bytes.buffer,this.allocation.bytes.byteOffset).getInt32(t,!0)}},ko=class{wrapper;reader;allocation;wrapperAllocation;numericBytes;knownMask;view;values={};base;notifications;attributes=new Map;arrays=new Map;guidScratch=[];bucketAllocation=null;buckets=[];owner=null;propertyObject=null;consumer=null;constructor(e,t,n,r){this.wrapper=e,this.reader=t,this.allocation=n,this.wrapperAllocation=r,this.numericBytes=n.bytes,this.knownMask=n.knownMask,this.view=new DataView(this.numericBytes.buffer,this.numericBytes.byteOffset,this.numericBytes.byteLength),this.base=new wa(e.identity+`:native`,`gCPlayerMemory_PS`,60,this.values,{read:()=>this.owner,write:e=>{this.reader.guard(),this.owner=e,this.pointerBits(12,e)}},null,{added:e=>this.emptyCallback(e,`Engine:30481830`),removed:e=>this.emptyCallback(e,`Engine:30481840`),postRead:e=>this.reader.run(()=>{if(this.exact(),e!==this.base)throw Error(`Same physical PlayerMemory PostRead required`);this.reader.postReadInternal(this,So)})},()=>bo(!0)),Object.defineProperty(this.base,"referenceWord",{get:()=>this.dword(8),set:e=>this.putWord(8,e)}),Object.defineProperty(this.base,"wrapper",{get:()=>this.propertyObject,set:e=>{this.propertyObject=e,this.pointerBits(4,e)}}),Object.defineProperties(this.base.baseFlags,{value:{get:()=>this.numericBytes[16],set:e=>{this.reader.guard(),this.numericBytes[16]=wo(e,255)}},knownMask:{get:()=>this.knownMask[16],set:e=>{this.reader.guard(),this.knownMask[16]=wo(e,255)}}}),this.notifications=new ma(this.base.identity,`gCPlayerMemory_PS`,this.values,null),Object.defineProperty(this.notifications,"owner",{get:()=>this.base.owner.read()?.propertyOwner??null,set:e=>{throw Error(`Notifications follow the actual retained EntityPS.owner slot`)}});for(let e of z.fields)this.bindField(e)}emptyCallback(e,t){return this.reader.run(()=>{if(this.exact(),e!==this.base)throw Error(`Same physical PlayerMemory callback required`);this.reader.note(`inherited callback RET`,t)})}get memory(){if(this.reader.runtimeGuard(),this.exact(),this.consumer===null)throw Error(`Actual PlayerMemory defaults/PostInitialize have not completed`);return this.consumer}initializeConsumer(e){if(e!==So||this.consumer!==null)throw Error(`Actual one-time PlayerMemory consumer binding required`);this.consumer=new oo(this.notifications,this.attributes)}exact(e=!0){let t=this.reader.controller.allocations().find(e=>e.wrapper===this.wrapper);if(this.allocation.freed||this.wrapperAllocation.freed||this.wrapper.deleted||t?.nativeObject!==this.base||this.base.values!==this.values||e&&(this.wrapper.native!==this.base||this.base.wrapper!==this.wrapper)||this.wrapper.factory!==this.reader.factory||this.dword(0)!==543786076)throw Error(`Same live original PlayerMemory physical allocation required`);let n=new DataView(this.wrapperAllocation.bytes.buffer,this.wrapperAllocation.bytes.byteOffset,16),r=new DataView(this.wrapperAllocation.knownMask.buffer,this.wrapperAllocation.knownMask.byteOffset,16);if(r.getUint32(0,!0)!==4294967295||n.getUint32(0,!0)!==543784236||r.getUint32(4,!0)!==134217727||(n.getUint32(4,!0)&7)!=2||r.getUint32(12,!0)!==0)throw Error(`Actual PlayerMemory wrapper leaf/flags/root/type capability required`)}require(e,t){if(!this.knownMask.subarray(e,e+t).every(e=>e===255))throw Error(`PlayerMemory field bytes unknown+`+e.toString(16))}dword(e){return this.require(e,4),this.view.getUint32(e,!0)}putWord(e,t){this.reader.guard(),this.view.setUint32(e,wo(t),!0),this.knownMask.fill(255,e,e+4)}putByte(e,t){this.reader.guard(),this.numericBytes[e]=wo(t,255),this.knownMask[e]=255}raw(e,t,n){if(this.reader.guard(),e<0||e+t.length>184||n&&n.length!==t.length)throw Error(`Actual PlayerMemory write bounds required`);this.numericBytes.set(t,e),n?this.knownMask.set(n,e):this.knownMask.fill(255,e,e+t.length)}pointerBits(e,t){this.reader.guard(),t===null?this.putWord(e,0):this.knownMask.fill(0,e,e+4)}bindField(e){let t=e.nativeOffset;if(e.typeName.startsWith(`bTObjArray<`)||e.typeName.startsWith(`bTValArray<`)){let n=new Oo(this,t,e.typeName.includes(`bCString`)?`CString`:e.typeName.includes(`bool`)?`bool`:`long`);this.arrays.set(t,n),Object.defineProperty(this.values,e.name,{enumerable:!0,get:()=>n});return}Object.defineProperty(this.values,e.name,{enumerable:!0,get:()=>(this.reader.runtimeGuard(),e.typeName===`bool`?(this.require(t,1),this.numericBytes[t]!==0):e.typeName===`float`?(this.require(t,4),this.view.getFloat32(t,!0)):e.typeName===`bCPropertyID`?(this.require(t,20),{rawGuid20:Eo(this.numericBytes.subarray(t,t+20)),referenceKind:`unspecified`}):e.typeName.startsWith(`bTPropertyContainer<`)?{value:this.dword(t+4)}:e.typeName===`long`&&e.name!==`TutorialFlags`?this.dword(t)|0:this.dword(t)),set:n=>{if(this.reader.runtimeGuard(),e.typeName===`bool`&&typeof n==`boolean`)this.putByte(t,Number(n));else if(e.typeName===`float`&&typeof n==`number`&&Number.isFinite(n)&&Object.is(n,Math.fround(n)))this.view.setFloat32(t,n,!0),this.knownMask.fill(255,t,t+4);else if(typeof n==`number`&&Number.isInteger(n)&&(e.typeName===`long`&&e.name!==`TutorialFlags`?n>=-2147483648&&n<=2147483647:n>=0&&n<=4294967295))this.putWord(t,n>>>0);else throw Error(`Actual PlayerMemory scalar assignment required: `+e.name)}})}},Ao=class{controller;attributeReader;host;factory;retained=new WeakMap;active=!1;reentered=!1;hostDepth=0;constructor(e,t,n){if(this.controller=e,this.attributeReader=t,this.host=n,t.controller!==e)throw Error(`PlayerMemory and Attribute factories require same original controller`);let r=Object.freeze({className:`gCPlayerMemory_PS`,baseClassName:`eCEntityPropertySet`,fields:Object.freeze(z.fields.map(e=>Object.freeze({...e})))});this.factory={root:r,nativeCategory:`entity-property-set`,cloneRoot:t=>t===e?this.run(()=>this.construct()):xo(`Same original controller required`),read:(e,t)=>this.run(()=>this.read(e,t)),getVersion:e=>{let t=this.properties(e);return t.known?bo(6):t}},Co(e.registerFactory(this.factory),`PlayerMemory concrete factory registration`)}guard(){let e=this.controller.receipt().required;if(e!==null)throw Error(e);if(this.reentered)throw Error(`Reentrant PlayerMemory mutation attempted`)}runtimeGuard(){if(this.guard(),this.hostDepth!==0)throw this.reentered=!0,Error(`PlayerMemory consumer used during an unresolved native service callback`)}run(e){if(this.active)return this.reentered=!0,xo(`Reentrant original PlayerMemory operation unsupported`);this.active=!0,this.reentered=!1;try{return this.controller.value(()=>{this.guard();let t=e();return this.guard(),t})}finally{this.active=!1}}note(e,t){this.guard(),this.controller.write(e,t),this.guard()}call(e,t,n){this.guard();let r=this.controller.effect(e,t,()=>{this.hostDepth++;try{return n()}finally{this.hostDepth--}});return this.guard(),r}properties(e,t=!0){let n=this.retained.get(e);if(!n)return xo(`Actual retained PlayerMemory wrapper required`);try{return n.exact(t),bo(n)}catch(e){return xo(e instanceof Error?e.message:String(e))}}playerMemory(e){let t=this.properties(e);if(!t.known)return t;try{return bo(t.value.memory)}catch(e){return xo(String(e))}}actual(e){return Co(this.properties(e),`PlayerMemory receiver`)}enumDefault(e){let t=this.call(`current mutable WeaponConfig default DWORD`,`Game:2031ea10`,()=>this.host.enumDefault?.(`207c1578`)),n=new Uint8Array(4),r=new Uint8Array(4);new DataView(n.buffer).setUint32(0,wo(t.value),!0),new DataView(r.buffer).setUint32(0,wo(t.knownMask),!0),e.raw(100,n,r)}construct(){let e=To(this.call(`MemoryAdmin.New wrapper16/tag190`,z.sources.clone,()=>this.host.allocateWrapper?.(16,400)),16,`PlayerMemory wrapper`),t=this.controller.allocateWrapper(this.factory,z.sources.clone),n=new DataView(e.bytes.buffer,e.bytes.byteOffset,16),r=new DataView(e.knownMask.buffer,e.knownMask.byteOffset,16);n.setUint32(0,parseInt(z.wrapperVtable,16),!0),r.setUint32(0,4294967295,!0),n.setUint32(4,n.getUint32(4,!0)&4160749568|10,!0),r.setUint32(4,134217727,!0),n.setUint32(8,0,!0),r.setUint32(8,4294967295,!0),r.setUint32(12,0,!0),Object.defineProperties(t.flags,{value:{get:()=>n.getUint32(4,!0),set:e=>{this.guard(),n.setUint32(4,wo(e),!0)}},knownMask:{get:()=>r.getUint32(4,!0),set:e=>{this.guard(),r.setUint32(4,wo(e),!0)}}});let i=null;Object.defineProperty(t,"native",{get:()=>(this.guard(),i),set:e=>{if(this.guard(),e!==null&&this.retained.get(t)?.base!==e)throw Error(`Actual retained PlayerMemory wrapper native required`);i=e,e===null?(n.setUint32(8,0,!0),r.setUint32(8,4294967295,!0)):r.setUint32(8,0,!0)}});let a=To(this.call(`MemoryAdmin.New PlayerMemory184/tagc4`,`Game:20327f10`,()=>this.host.allocateNative?.(184,196,t)),184,`PlayerMemory native`),o=new ko(t,this,a,e);o.putWord(0,543786076),o.putWord(4,0),o.putWord(8,1),o.putWord(12,0),this.retained.set(t,o),this.controller.retainNative(t,o.base),o.numericBytes[16]=o.numericBytes[16]&240|1,o.knownMask[16]=o.knownMask[16]|15;for(let e=24;e<=80;e+=4)o.putWord(e,0);o.putWord(96,543783876),this.enumDefault(o),o.raw(104,new Uint8Array(20)),this.note(`fresh native ctor base/arrays/WeaponConfig/PropertyID`,`Game:2031e9c0`);for(let e of[168,172,176,180])o.putWord(e,0);return this.reserveBuckets(o),this.note(`hash constructor43 zero buckets`,`Game:20327550`),o.base.isValid()||(this.politicalArraysNine(o),o.base.createBase(),this.note(`PlayerMemory.Create inherited base validity after political arrays`,`Engine:3003b863`)),this.note(`PlayerMemory.Create IsValid AL==1 gate and literal1`,z.sources.create),this.controller.setAllocationPhase(t,`created`),this.controller.attachConstructedNative(t,o.base,`Game:2031f540`,`Game:20327f10`),this.controller.initializeProperties(t,e=>this.controller.value(()=>this.assignDefault(o,e)),()=>this.controller.value(()=>this.postInitialize(o)),`Game:2031e3c0`),t}descriptor(e){let t=this.factory.root.fields.find(t=>t===e);if(!t)throw Error(`Actual registered original PlayerMemory descriptor required`);return t}assignDefault(e,t){e.exact();let n=this.descriptor(t),r=n.nativeOffset;if(n.typeName===`bool`)e.putByte(r,0);else if(n.typeName===`long`||n.typeName===`float`||n.typeName===`unsigned_long`)e.putWord(r,0);else if(n.typeName.startsWith(`bTPropertyContainer<`))this.enumDefault(e);else if(n.typeName===`bCPropertyID`){let t={bytes:new Uint8Array(20),knownMask:new Uint8Array(20),destroyed:!1};t.knownMask[16]=255,e.guidScratch.push(t),this.note(`temporary Guid ctor validity byte0 only`,`SharedBase:100063c5`),this.call(`CoCreateGuid captured scratch; ignored HRESULT`,`SharedBase:10012570`,()=>this.host.coCreateGuid?.(t)),t.bytes[16]=1,t.knownMask[16]=255,e.raw(r,t.bytes.subarray(0,16),t.knownMask.subarray(0,16)),e.putWord(r+16,0),t.destroyed=!0,this.note(`PropertyID.CreateRandom copy16/cache0 and Guid destructor RET`,`SharedBase:10092760`)}else if(e.arrays.has(r)){let t=e.arrays.get(r);if(t.count<0||t.capacity<t.count||t.capacity>0&&(!t.allocation||t.allocation.freed))throw Error(`Actual array default destination required`)}else throw Error(`Unaudited PlayerMemory default: `+n.name);this.note(`descriptor default `+n.name,n.defaultInitializer??n.default??n.reader)}postInitialize(e){e.exact(),this.note(`inherited PostInitialize literal1`,`SharedBase:100076f8`),e.putByte(20,0);for(let t=124;t<=152;t+=4)e.putWord(t,0);for(let t=156;t<=159;t++)e.putByte(t,0);e.putWord(160,0),e.putByte(164,0),this.note(`PostInitialize transient fields zero`,`Game:2031e3c0`),e.initializeConsumer(So),this.createAttributes(e)}resizeArray(e,t,n){let r=e.capacity,i=e.count,a=e.stride;if(!Number.isInteger(t)||t<0||t>Math.floor(2147483647/a)||i<0||i>r)throw Error(`Selected finite original array allocation extent required`);if(r>=t)return;let o=t+(n?Math.max(8,Math.min(1024,r>>3)):0),s=To(this.call(`array MemoryAdmin.Realloc captured backing`,`Game:`+(e.kind===`CString`?`2028f890`:e.kind===`bool`?`20321430`:`201237e0`),()=>this.host.realloc?.(e.allocation,o*a)),o*a,`PlayerMemory array`);if(e.allocation=s,e.properties.pointerBits(e.nativeOffset,s),e.kind===`CString`){for(let t=r;t<o;t++)e.strings[t]=new Do(s,t*4,this);for(let t=0;t<r;t++)e.strings[t].relocate(s)}else{let e=i*a,t=e+(o-r)*a;s.bytes.fill(0,e,t),s.knownMask.fill(255,e,t)}e.capacity=o,this.note(`array capacity after original zero/construct range`,`Game:array reserve`)}readArray(e,t){t.u8();let n=t.u32();if(this.resizeArray(e,n,!1),e.kind===`CString`&&n<e.count)for(let t=n;t<e.count;t++)e.strings[t].destroy(),e.strings[t].constructNull();if(e.count=n,e.kind===`CString`)for(let n=0;n<e.count;n++)this.indexedString(e.strings[n],t);else if(n!==0){let r=e.allocation;if(!r||r.freed)throw Error(`Actual bulk array backing required`);let i=t.take(n*e.stride);r.bytes.set(i),r.knownMask.fill(255,0,i.length)}this.note(`current array count/elements consumed`,`Game:`+(e.kind===`CString`?`2028f890`:e.kind===`bool`?`20321430`:`201237e0`))}notify(e,t,n){e.exact();let r=e.notifications.notify(t,n,!0);for(let e of r.trace)this.note(e.operation+` `+n,t===`enter`?`Engine:3003b5bb`:`Engine:3001a091`);if(!r.supported)throw Error(r.reason)}readField(e,t,n){let r=this.descriptor(t),i=n.u16();n.u32(),this.note(`descriptor version/size consumed without seek: `+t.name,r.reader),e.native!==null&&this.notify(this.actual(e),`enter`,t.name);let a=this.actual(e),o=r.nativeOffset;if(a.arrays.has(o))i>=30&&this.readArray(a.arrays.get(o),n);else if(r.typeName===`bool`)a.putByte(o,n.u8());else if(r.typeName===`long`||r.typeName===`float`||r.typeName===`unsigned_long`)a.raw(o,n.take(4));else if(r.typeName.startsWith(`bTPropertyContainer<`))n.u16(),a.raw(o+4,n.take(4));else if(r.typeName===`bCPropertyID`){let e=n.take(20);a.raw(o,e.subarray(0,16)),a.putWord(o+16,0)}else throw Error(`Unaudited PlayerMemory descriptor reader`);this.note(`actual descriptor payload write `+t.name,r.reader),e.native!==null&&this.notify(this.actual(e),`exit`,t.name)}read(e,t){return this.actual(e),this.controller.readWrapperProperties(e,t,{wrapperSource:z.sources.wrapperRead,dataSource:z.sources.dataRead,readField:(t,n)=>this.controller.value(()=>this.readField(e,t,n)),readNative:t=>this.controller.value(()=>{let n=this.actual(e),r=t.u16();if(this.note(`derived PlayerMemory.Read version`,`Game:2031ea60`),r>4)this.readAttributes(n,t);else if(r>2)throw Error(`Game:2031ea60 requires actual legacy ReadAttributesV`+r+` implementation`);this.note(`derived Read returns literal1; no inherited Read`,`Game:2031ea60`)})})}reserveBuckets(e){let t=e.dword(176),n=e.dword(172);if(t<43){let r=43+Math.max(8,Math.min(1024,t>>3)),i=To(this.call(`hash MemoryAdmin.Realloc43/growth0`,`Game:203205f0`,()=>this.host.realloc?.(e.bucketAllocation,r*4)),r*4,`PlayerMemory hash`);e.bucketAllocation=i,e.pointerBits(168,i),i.bytes.fill(0,n*4,(n+r-t)*4),i.knownMask.fill(255,n*4,(n+r-t)*4),e.putWord(176,r)}if(e.putWord(172,43),e.buckets.length=43,e.buckets.fill(null),!e.bucketAllocation)throw Error(`Actual hash bucket allocation required`);e.bucketAllocation.bytes.fill(0,0,172),e.bucketAllocation.knownMask.fill(255,0,172)}bucket(e,t){let n=e.dword(172);if(n===0||n!==e.buckets.length)throw Error(`Actual nonzero current original hash bucket count required`);return t.hash()%n}find(e,t,n){for(let r=e.buckets[n]??null;r!==null;r=r.next){if(r.allocation.freed)throw Error(`Freed hash node`);if(t.equals(r.key))return r}return null}node(e,t){let n=this.bucket(e,t),r=this.find(e,t,n);if(r!==null)return r;let i=To(this.call(`hash node new12/tag199`,`Game:2031e863`,()=>this.host.allocateNode?.(12,409)),12,`PlayerMemory hash node`),a=new Do(i,0,this);this.call(`hash key CString assignment`,`Game:20321560`,()=>this.host.assignCString?.(a,t));let o=e.buckets[n]??null,s={allocation:i,key:a,value:null,next:o};return o===null?(i.bytes.fill(0,8,12),i.knownMask.fill(255,8,12)):i.knownMask.fill(0,8,12),e.buckets[n]=s,e.bucketAllocation.knownMask.fill(0,n*4,n*4+4),e.putWord(180,e.dword(180)+1>>>0),this.note(`hash copied key/head next/count insert`,`Game:20321560`),s}store(e,t,n){t.value=n,n===null?(t.allocation.bytes.fill(0,4,8),t.allocation.knownMask.fill(255,4,8)):t.allocation.knownMask.fill(0,4,8),e.attributes.set(t.key.text,n),this.note(`same native node/store and consumer Map assignment`,`Game:2031e8a4`)}destroyAttributes(e){e.exact();for(let t=0;t<e.dword(172);t++)for(let n=e.buckets[t]??null;n!==null;n=n.next)if(n.value!==null){let t=n.value;this.call(`native Attribute virtual24 ReleaseReference`,`Game:2031e5d0`,()=>this.attributeReader.nativeReleaseReference(t)),this.store(e,n,null)}for(let t=0;t<e.dword(172);t++){let n=e.buckets[t]??null;for(;n!==null;){let e=n.next;if(n.key.destroy(),this.call(`hash MemoryAdmin.DeleteObject captured node`,`Game:20327490`,()=>this.host.deleteNode?.(n.allocation)),!n.allocation.freed)throw Error(`Actual node DeleteObject must end captured allocation lifetime`);n=e}}let t=e.bucketAllocation;if(t!==null){if(this.call(`hash MemoryAdmin.Free captured bucket backing`,`Game:20327490`,()=>this.host.free?.(t)),!t.freed)throw Error(`Actual hash Free must end captured allocation lifetime`);e.bucketAllocation=null,e.putWord(168,0),e.putWord(172,0),e.putWord(176,0)}e.putWord(180,0),e.attributes.clear(),this.reserveBuckets(e),this.note(`DestroyAttributes reconstructs same empty hash and consumer Map`,`Game:20327490`)}temporaryCString(e){let t=new Do({identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4),freed:!1},0,this);if(e!==null&&(this.call(`local CString constructor literal`,`Game:2031e140`,()=>this.host.constructCString?.(t,e)),t.text!==e))throw Error(`Actual CString literal constructor did not store original source`);return t}indexedString(e,t){let n=t.cursor(),r=n+2<=t.end?new DataView(t.bytes.buffer,t.bytes.byteOffset+n,2).getUint16(0,!0):-1,i=t.strings[r];if(typeof i!=`string`)throw Error(`Original indexed PlayerMemory CString source absent`);if(this.call(`stream Read actual owned CString`,`SharedBase:10015430`,()=>this.host.readCString?.(e,t)),t.cursor()!==n+2||e.text!==i)throw Error(`PlayerMemory CString service did not consume/store exact indexed source`)}warning(e,t,n){this.call(`GE_MESSAGEF_WARN`,n,()=>this.host.warning?.(e,t,n))}unicodeSlot(e){let t={identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4),freed:!1};return e===null&&t.knownMask.fill(255),{identity:{},slot:t,pointer:e,destroyed:!1}}unicodeSpace(){let e=To(this.call(`Unicode literal space MemoryAdmin.Malloc16`,`SharedBase:1000648d`,()=>this.host.allocateUnicode?.(16)),16,`original Unicode space`),t=new DataView(e.bytes.buffer,e.bytes.byteOffset,16);return t.setInt32(0,1,!0),t.setInt32(4,1,!0),t.setInt32(8,1,!0),t.setUint16(14,0,!0),e.knownMask.fill(255,0,12),e.knownMask.fill(255,14,16),t.setUint16(12,32,!0),e.knownMask.fill(255,12,14),this.note(`Unicode space header1/1/1 and wchar space/NUL`,`SharedBase:1000648d`),this.unicodeSlot(e)}unicodeCopy(e){if(e.destroyed||e.slot.freed)throw Error(`Actual live Unicode copy source required`);let t=e.pointer;if(t===null)return this.note(`Unicode copy NULL branch`,`SharedBase:10007b6c`),this.unicodeSlot(null);if(t.freed||!t.knownMask.subarray(0,4).every(e=>e===255))throw Error(`Actual Unicode header reference bytes required`);let n=new DataView(t.bytes.buffer,t.bytes.byteOffset,t.bytes.length),r=n.getInt32(0,!0);if(r<=0)throw Error(`Selected original Unicode copy needs positive shared reference count`);return n.setInt32(0,r+1,!0),this.note(`Unicode copy same character allocation/DWORD reference increment`,`SharedBase:10007b6c`),this.unicodeSlot(t)}destroyUnicode(e){if(e.destroyed||e.slot.freed)throw Error(`Actual live Unicode destructor receiver required`);let t=e.pointer;if(t!==null){if(t.freed||!t.knownMask.subarray(0,4).every(e=>e===255))throw Error(`Actual Unicode destructor reference bytes required`);let e=new DataView(t.bytes.buffer,t.bytes.byteOffset,t.bytes.length),n=e.getInt32(0,!0)-1|0;if(e.setInt32(0,n,!0),this.note(`Unicode destructor captured DWORD reference decrement`,`SharedBase:10001848`),n<1&&(this.call(`Unicode destructor actual MemoryAdmin.Free block`,`SharedBase:10001848`,()=>this.host.free?.(t)),!t.freed))throw Error(`Actual Unicode Free must end captured allocation lifetime`)}e.destroyed=!0,this.note(`Unicode destructor ends object without clearing pointer slot`,`SharedBase:10001848`)}localize(e,t){for(let[n,r]of[`ATTRIB_`,`ATTRIBDESC_`,`ATTRIBTAG_`].entries()){let i=this.unicodeSpace(),a=this.unicodeCopy(i),o=this.unicodeSlot(null);this.note(`temporary Unicode default constructor NULL slot`,`SharedBase:1000656e`);let s=this.temporaryCString(null);this.call(`operator+ CString localization key`,`Game:2031db70`,()=>this.host.concatenateCString?.(s,r,e));let c=this.call(`eCLocAdmin.GetInstance actual singleton`,`Engine:3002959b`,()=>this.host.localizationAdmin?.());this.call(`eCLocAdmin.ReserveString actual entry`,`Game:`+(t?[540139106,540139213,540139314]:[540138594,540138701,540138802])[n].toString(16),()=>this.host.reserveString?.(c,s,{text:a,description:o})),s.destroy();for(let e of[o,a,i])this.destroyUnicode(e)}}createAttribute(e,t,n){let r=n?`Game:2031dd70`:`Game:2031db70`;if(this.find(e,t,this.bucket(e,t))!==null&&this.node(e,t).value!==null){let i=this.node(e,t).value;if(i===null)throw Error(`Source attribute receiver changed during lookup`);let a=Co(this.attributeReader.tag(i),`actual native Attribute Tag CString`);if(t.equals(a))return!1;let o=this.node(e,t).value;if(o===null)throw Error(`Source mismatching-tag warning receiver became NULL`);this.warning(`gCPlayerMemory_PS::`+(n?`CreateStat`:`CreateAttrib`)+` -> Detected attrib with mismatching tag: %s -> %s. Forcing re-creation.`,[t.text,o.values.Tag],r)}let i=this.call(`QueryNewObject/creator/native AddReference/GetNative/creator destruction`,n?`Game:20320b80`:`Game:20320af0`,()=>this.attributeReader.create(n?`gCStat`:`gCAttribute`));return this.call(`Tag false NotifyEnter/CString assignment/NotifyExit`,r,()=>this.attributeReader.setTag(i,t)),this.store(e,this.node(e,t),i),this.localize(t,n),!0}createAttributes(e){let t=[`SP`,`MP`,`HP`,`PROT_LIGHTNING`,`PROT_ICE`,`PROT_FIRE`,`PROT_MISSILE`,`PROT_IMPACT`,`PROT_BLADE`,`ALC`,`THF`,`SMT`,`INT`,`DEX`,`STR`],n=new Map;for(let e of[...t].reverse())n.set(e,this.temporaryCString(e));let r=0;for(let[i,a]of t.entries())r+=Number(this.createAttribute(e,n.get(a),i<3));for(let e of t)n.get(e).destroy();return this.note(`CreateAttributes original15 order and CString lifetimes`,`Game:2031e140`),r}readAttributes(e,t){this.destroyAttributes(e);let n=t.u32()|0;this.note(`ReadAttributes signed count`,`Game:2031e700`);for(let r=0;r<n;r++){let n=this.temporaryCString(null);this.indexedString(n,t),this.find(e,n,this.bucket(e,n))!==null&&this.warning(`gCPlayerMemory_PS::ReadAttributes -> Detected multiple entries for attrib: %s.`,[n.text],`Game:2031e700`);let r=this.call(`actual Attribute accessor.Read`,`Game:2031e700`,()=>this.controller.readAccessor(t)),i=Co(r.nativeObject(),`Attribute accessor GetNativeObject`),a=null;if(r.instance!==null&&i!==null){if(r.instance.factory===this.attributeReader.attributeFactory||r.instance.factory===this.attributeReader.statFactory){if(a=Co(this.attributeReader.attribute(r.instance),`actual Attribute/Stat RTTI cast`),a!==i)throw Error(`RTTI Attribute cast must retain exact accessor native pointer`)}else if(!this.controller.allocations().some(e=>e.nativeObject===i&&e.wrapper.factory.nativeCategory===`entity-property-set`))throw Error(`Actual original Attribute RTTI result unresolved for foreign reflected object`)}if(a===null&&this.warning(`gCPlayerMemory_PS::ReadAttributes -> Detected invalid attrib: %s.`,[n.text],`Game:2031e700`),this.store(e,this.node(e,n),a),a!==null&&this.call(`nonnull Attribute native virtual20 AddReference before accessor destruction`,`Game:2031e8b4`,()=>this.attributeReader.nativeAddReference(a)),a===null)throw Error(`Game:2031e8b6 original INFO argument preparation dereferences NULL invalid attribute`);let o=a.values.Tag;this.call(`GE_MESSAGEF_INFO level5 current key and Tag`,`Game:2031e8c6`,()=>this.host.info?.(5,`gCPlayerMemory_PS::ReadAttributes -> Read attribute: %s [%s].`,[n.text,o],`Game:2031e8c6`)),this.call(`actual accessor destructor after native reference/log`,`Game:2031e700`,()=>r.destroy()),n.destroy()}let r=this.createAttributes(e);r>0&&this.warning(`gCPlayerMemory_PS::ReadAttributes -> Created %d missing/broken attributes.`,[r],`Game:2031e700`),this.note(`ReadAttributes returns literal1`,`Game:2031e700`)}postReadInternal(e,t){if(t!==So)throw Error(`Actual guarded native PlayerMemory PostRead required`);e.exact(),this.politicalArraysNine(e),this.note(`OnPostRead political array9 order`,`Game:2031d510`),this.note(`OnPostRead inherited callback RET`,`Engine:304818a0`)}politicalArraysNine(e){for(let t of[36,48,72,60]){let n=e.arrays.get(t);this.resizeArray(n,9,!0),n.count=9,this.note(`reserve9/growth0 and count9`,n.kind===`bool`?`Game:200ae420`:`Game:20064480`)}}},B=JSON.parse(`{
  "schema": "gothic3-npc-reading-rules-v1",
  "inputs": {
    "SharedBase": "5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214",
    "Engine": "d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3",
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f"
  },
  "className": "gCNPC_PS",
  "propertyType": 30,
  "getVersion": 78,
  "nativeBytes": 508,
  "nativeVtable": "2069668c",
  "wrapperVtable": "20695ac4",
  "fields": [
    {
      "name": "Description",
      "typeName": "bCString",
      "nativeOffset": 20,
      "registrar": "Game:20513430",
      "reader": "Game:200306fc",
      "default": "Game:20015de8",
      "descriptorRead": "Game:2000dad0",
      "memberAccessor": "Game:20028835"
    },
    {
      "name": "Voice",
      "typeName": "bCString",
      "nativeOffset": 24,
      "registrar": "Game:205134e0",
      "reader": "Game:200306fc",
      "default": "Game:20015de8",
      "descriptorRead": "Game:2000dad0",
      "memberAccessor": "Game:20028835"
    },
    {
      "name": "RoleDescription",
      "typeName": "bCString",
      "nativeOffset": 28,
      "registrar": "Game:20513590",
      "reader": "Game:200306fc",
      "default": "Game:20015de8",
      "descriptorRead": "Game:2000dad0",
      "memberAccessor": "Game:20028835"
    },
    {
      "name": "Level",
      "typeName": "unsigned_long",
      "nativeOffset": 32,
      "registrar": "Game:20513640",
      "reader": "Game:20028ed4",
      "default": "Game:2002f018",
      "descriptorRead": "Game:2002c03e",
      "memberAccessor": "Game:20015c76"
    },
    {
      "name": "LevelMax",
      "typeName": "unsigned_long",
      "nativeOffset": 36,
      "registrar": "Game:205136e0",
      "reader": "Game:20028ed4",
      "default": "Game:2002f018",
      "descriptorRead": "Game:2002c03e",
      "memberAccessor": "Game:20015c76"
    },
    {
      "name": "Gender",
      "typeName": "bTPropertyContainer<gEGender>_",
      "nativeOffset": 40,
      "registrar": "Game:20513780",
      "reader": "Game:20012ed6",
      "default": "Game:20018322",
      "descriptorRead": "Game:2000c1bc",
      "memberAccessor": "Game:200314ee",
      "enum": {
        "vtable": "20695264",
        "global": "207c0928",
        "valueOffset": 44,
        "nativeRead": "Game:20033604",
        "nativeDefault": "Game:2000db48"
      }
    },
    {
      "name": "Species",
      "typeName": "bTPropertyContainer<gESpecies>_",
      "nativeOffset": 48,
      "registrar": "Game:20513820",
      "reader": "Game:2001f18b",
      "default": "Game:2001d606",
      "descriptorRead": "Game:2000882d",
      "memberAccessor": "Game:20026ba7",
      "enum": {
        "vtable": "2069533c",
        "global": "207c092c",
        "valueOffset": 52,
        "nativeRead": "Game:20015b9f",
        "nativeDefault": "Game:20026350"
      }
    },
    {
      "name": "PoliticalAlignment",
      "typeName": "bTPropertyContainer<gEPoliticalAlignment>_",
      "nativeOffset": 56,
      "registrar": "Game:205138c0",
      "reader": "Game:2002bc74",
      "default": "Game:20011a9a",
      "descriptorRead": "Game:200340f9",
      "memberAccessor": "Game:200215a8",
      "enum": {
        "vtable": "206671f4",
        "global": "207b7f08",
        "valueOffset": 60,
        "nativeRead": "Game:2002c2e1",
        "nativeDefault": "Game:20029ee7"
      }
    },
    {
      "name": "Class",
      "typeName": "bTPropertyContainer<gEClass>_",
      "nativeOffset": 64,
      "registrar": "Game:20513960",
      "reader": "Game:20026517",
      "default": "Game:20026f94",
      "descriptorRead": "Game:20018ac0",
      "memberAccessor": "Game:2000db5c",
      "enum": {
        "vtable": "20695414",
        "global": "207c0930",
        "valueOffset": 68,
        "nativeRead": "Game:2000fcae",
        "nativeDefault": "Game:20029744"
      }
    },
    {
      "name": "Type",
      "typeName": "bTPropertyContainer<gENPCType>_",
      "nativeOffset": 72,
      "registrar": "Game:20513a00",
      "reader": "Game:20019f01",
      "default": "Game:2002b61b",
      "descriptorRead": "Game:2001dd1d",
      "memberAccessor": "Game:2001688d",
      "enum": {
        "vtable": "206954ec",
        "global": "207c0934",
        "valueOffset": 76,
        "nativeRead": "Game:2001965a",
        "nativeDefault": "Game:20025211"
      }
    },
    {
      "name": "Enclave",
      "typeName": "bCPropertyID",
      "nativeOffset": 80,
      "registrar": "Game:20513aa0",
      "reader": "Game:2001d863",
      "default": "Game:2001493e",
      "descriptorRead": "Game:20003fd5",
      "memberAccessor": "Game:20032d76"
    },
    {
      "name": "AttitudeToPlayer2",
      "typeName": "bTPropertyContainer<gEAttitude>_",
      "nativeOffset": 100,
      "registrar": "Game:20513b40",
      "reader": "Game:200154fb",
      "default": "Game:200346a8",
      "descriptorRead": "Game:200243a2",
      "memberAccessor": "Game:200349be",
      "enum": {
        "vtable": "206955c4",
        "global": "207c0938",
        "valueOffset": 104,
        "nativeRead": "Game:2002dadd",
        "nativeDefault": "Game:2000b1c2"
      }
    },
    {
      "name": "LastPlayerCrime",
      "typeName": "bTPropertyContainer<gEPlayerCrime>_",
      "nativeOffset": 108,
      "registrar": "Game:20513be0",
      "reader": "Game:20022863",
      "default": "Game:2002a879",
      "descriptorRead": "Game:2003183b",
      "memberAccessor": "Game:2000660e",
      "enum": {
        "vtable": "20667354",
        "global": "207b7f0c",
        "valueOffset": 112,
        "nativeRead": "Game:20034987",
        "nativeDefault": "Game:2000c74d"
      }
    },
    {
      "name": "AttackReason",
      "typeName": "bTPropertyContainer<gEAttackReason>_",
      "nativeOffset": 116,
      "registrar": "Game:20513c80",
      "reader": "Game:2002671f",
      "default": "Game:20021a12",
      "descriptorRead": "Game:200236e6",
      "memberAccessor": "Game:200252bb",
      "enum": {
        "vtable": "2069569c",
        "global": "207c093c",
        "valueOffset": 120,
        "nativeRead": "Game:2002d1af",
        "nativeDefault": "Game:2000bd2a"
      }
    },
    {
      "name": "LastPlayerAR",
      "typeName": "bTPropertyContainer<gEAttackReason>_",
      "nativeOffset": 124,
      "registrar": "Game:20513d20",
      "reader": "Game:2002671f",
      "default": "Game:20021a12",
      "descriptorRead": "Game:200236e6",
      "memberAccessor": "Game:200252bb",
      "enum": {
        "vtable": "2069569c",
        "global": "207c093c",
        "valueOffset": 128,
        "nativeRead": "Game:2002d1af",
        "nativeDefault": "Game:2000bd2a"
      }
    },
    {
      "name": "LastFightAgainstPlayer",
      "typeName": "bTPropertyContainer<gELastFightAgainstPlayer>_",
      "nativeOffset": 132,
      "registrar": "Game:20513dc0",
      "reader": "Game:200272d2",
      "default": "Game:2002f725",
      "descriptorRead": "Game:2002ddb2",
      "memberAccessor": "Game:20027d13",
      "enum": {
        "vtable": "20695774",
        "global": "207c0940",
        "valueOffset": 136,
        "nativeRead": "Game:2001b478",
        "nativeDefault": "Game:200168f6"
      }
    },
    {
      "name": "LastFightTimestamp",
      "typeName": "float",
      "nativeOffset": 140,
      "registrar": "Game:20513e60",
      "reader": "Game:2001e939",
      "default": "Game:20003648",
      "descriptorRead": "Game:20004219",
      "memberAccessor": "Game:20020b9e"
    },
    {
      "name": "LastDistToTarget",
      "typeName": "float",
      "nativeOffset": 144,
      "registrar": "Game:20513f00",
      "reader": "Game:2001e939",
      "default": "Game:20003648",
      "descriptorRead": "Game:20004219",
      "memberAccessor": "Game:20020b9e"
    },
    {
      "name": "DistToNearestMist",
      "typeName": "float",
      "nativeOffset": 148,
      "registrar": "Game:20513fa0",
      "reader": "Game:2001e939",
      "default": "Game:20003648",
      "descriptorRead": "Game:20004219",
      "memberAccessor": "Game:20020b9e"
    },
    {
      "name": "DefeatedByPlayer",
      "typeName": "bool",
      "nativeOffset": 152,
      "registrar": "Game:20514040",
      "reader": "Game:20034a86",
      "default": "Game:2000e88b",
      "descriptorRead": "Game:20002e55",
      "memberAccessor": "Game:20010203"
    },
    {
      "name": "Ransacked",
      "typeName": "bool",
      "nativeOffset": 153,
      "registrar": "Game:205140e0",
      "reader": "Game:20034a86",
      "default": "Game:2000e88b",
      "descriptorRead": "Game:20002e55",
      "memberAccessor": "Game:20010203"
    },
    {
      "name": "Discovered",
      "typeName": "bool",
      "nativeOffset": 154,
      "registrar": "Game:20514180",
      "reader": "Game:20034a86",
      "default": "Game:2000e88b",
      "descriptorRead": "Game:20002e55",
      "memberAccessor": "Game:20010203"
    },
    {
      "name": "LastFightComment",
      "typeName": "bool",
      "nativeOffset": 155,
      "registrar": "Game:20514220",
      "reader": "Game:20034a86",
      "default": "Game:2000e88b",
      "descriptorRead": "Game:20002e55",
      "memberAccessor": "Game:20010203"
    },
    {
      "name": "CurrentTargetEntity",
      "typeName": "eCEntityProxy",
      "nativeOffset": 156,
      "registrar": "Game:205142c0",
      "reader": "Game:2000442b",
      "default": "Game:2001924f",
      "descriptorRead": "Game:20008152",
      "memberAccessor": "Game:20014cfe"
    },
    {
      "name": "CurrentAttackerEntity",
      "typeName": "eCEntityProxy",
      "nativeOffset": 184,
      "registrar": "Game:20514360",
      "reader": "Game:2000442b",
      "default": "Game:2001924f",
      "descriptorRead": "Game:20008152",
      "memberAccessor": "Game:20014cfe"
    },
    {
      "name": "AlternativeTargetEntity",
      "typeName": "eCEntityProxy",
      "nativeOffset": 212,
      "registrar": "Game:20514400",
      "reader": "Game:2000442b",
      "default": "Game:2001924f",
      "descriptorRead": "Game:20008152",
      "memberAccessor": "Game:20014cfe"
    },
    {
      "name": "LastAttackerEntity",
      "typeName": "eCEntityProxy",
      "nativeOffset": 240,
      "registrar": "Game:205144a0",
      "reader": "Game:2000442b",
      "default": "Game:2001924f",
      "descriptorRead": "Game:20008152",
      "memberAccessor": "Game:20014cfe"
    },
    {
      "name": "CombatState",
      "typeName": "unsigned_long",
      "nativeOffset": 268,
      "registrar": "Game:20514540",
      "reader": "Game:20028ed4",
      "default": "Game:2002f018",
      "descriptorRead": "Game:2002c03e",
      "memberAccessor": "Game:20015c76"
    },
    {
      "name": "GuardPoint",
      "typeName": "eCEntityProxy",
      "nativeOffset": 272,
      "registrar": "Game:205145e0",
      "reader": "Game:2000442b",
      "default": "Game:2001924f",
      "descriptorRead": "Game:20008152",
      "memberAccessor": "Game:20014cfe"
    },
    {
      "name": "GuardStatus",
      "typeName": "bTPropertyContainer<gEGuardStatus>_",
      "nativeOffset": 300,
      "registrar": "Game:20514680",
      "reader": "Game:20021bed",
      "default": "Game:2000a05b",
      "descriptorRead": "Game:2001dbd3",
      "memberAccessor": "Game:20027377",
      "enum": {
        "vtable": "2067ddf4",
        "global": "207bb2f4",
        "valueOffset": 304,
        "nativeRead": "Game:20009d90",
        "nativeDefault": "Game:20034428"
      }
    },
    {
      "name": "LastDistToGuardPoint",
      "typeName": "float",
      "nativeOffset": 308,
      "registrar": "Game:20514720",
      "reader": "Game:2001e939",
      "default": "Game:20003648",
      "descriptorRead": "Game:20004219",
      "memberAccessor": "Game:20020b9e"
    },
    {
      "name": "Bearing",
      "typeName": "bTPropertyContainer<gEBearing>_",
      "nativeOffset": 312,
      "registrar": "Game:205147c0",
      "reader": "Game:2002fa81",
      "default": "Game:200014d8",
      "descriptorRead": "Game:20032687",
      "memberAccessor": "Game:20007a54",
      "enum": {
        "vtable": "206958d4",
        "global": "207c0944",
        "valueOffset": 316,
        "nativeRead": "Game:20034b67",
        "nativeDefault": "Game:20032efc"
      }
    },
    {
      "name": "TeachAttribs",
      "typeName": "bTObjArray<bCString>_",
      "nativeOffset": 320,
      "registrar": "Game:20514860",
      "reader": "Game:200193d5",
      "default": "Game:2001a686",
      "descriptorRead": "Game:2000b000",
      "memberAccessor": "Game:200308e6"
    },
    {
      "name": "TeachSkills",
      "typeName": "bTObjArray<eCTemplateEntityProxy>_",
      "nativeOffset": 332,
      "registrar": "Game:20514900",
      "reader": "Game:2001afd2",
      "default": "Game:2001df7f",
      "descriptorRead": "Game:20029546",
      "memberAccessor": "Game:20033bcc"
    },
    {
      "name": "ManaUsed",
      "typeName": "int",
      "nativeOffset": 344,
      "registrar": "Game:205149a0",
      "reader": "Game:20006127",
      "default": "Game:20031ac5",
      "descriptorRead": "Game:20017ba7",
      "memberAccessor": "Game:2001c940"
    },
    {
      "name": "SpellTarget",
      "typeName": "eCEntityProxy",
      "nativeOffset": 348,
      "registrar": "Game:20514a90",
      "reader": "Game:2000442b",
      "default": "Game:2001924f",
      "descriptorRead": "Game:20008152",
      "memberAccessor": "Game:20014cfe"
    },
    {
      "name": "LastSpell",
      "typeName": "bCString",
      "nativeOffset": 376,
      "registrar": "Game:20514b80",
      "reader": "Game:200306fc",
      "default": "Game:20015de8",
      "descriptorRead": "Game:2000dad0",
      "memberAccessor": "Game:20028835"
    },
    {
      "name": "StatusEffects",
      "typeName": "unsigned_long",
      "nativeOffset": 380,
      "registrar": "Game:20514c80",
      "reader": "Game:20028ed4",
      "default": "Game:2002f018",
      "descriptorRead": "Game:2002c03e",
      "memberAccessor": "Game:20015c76"
    },
    {
      "name": "TimeStampFrozen",
      "typeName": "unsigned_long",
      "nativeOffset": 384,
      "registrar": "Game:20514d70",
      "reader": "Game:20028ed4",
      "default": "Game:2002f018",
      "descriptorRead": "Game:2002c03e",
      "memberAccessor": "Game:20015c76"
    },
    {
      "name": "TimeStampBurning",
      "typeName": "unsigned_long",
      "nativeOffset": 388,
      "registrar": "Game:20514e60",
      "reader": "Game:20028ed4",
      "default": "Game:2002f018",
      "descriptorRead": "Game:2002c03e",
      "memberAccessor": "Game:20015c76"
    },
    {
      "name": "TimeStampPoisoned",
      "typeName": "unsigned_long",
      "nativeOffset": 392,
      "registrar": "Game:20514f50",
      "reader": "Game:20028ed4",
      "default": "Game:2002f018",
      "descriptorRead": "Game:2002c03e",
      "memberAccessor": "Game:20015c76"
    },
    {
      "name": "TimeStampDiseased",
      "typeName": "unsigned_long",
      "nativeOffset": 396,
      "registrar": "Game:20515040",
      "reader": "Game:20028ed4",
      "default": "Game:2002f018",
      "descriptorRead": "Game:2002c03e",
      "memberAccessor": "Game:20015c76"
    },
    {
      "name": "TimeStampTransformed",
      "typeName": "unsigned_long",
      "nativeOffset": 400,
      "registrar": "Game:20515130",
      "reader": "Game:20028ed4",
      "default": "Game:2002f018",
      "descriptorRead": "Game:2002c03e",
      "memberAccessor": "Game:20015c76"
    }
  ],
  "heroSerialized": {
    "className": "gCNPC_PS",
    "outerVersion": 78,
    "nativeReadVersion": 78,
    "objectVersion": 83,
    "propertyVersion": 30,
    "sourceOffset": 1186527,
    "endSourceOffset": 1187174,
    "serializedRaw": "4e00010001010001ed0b01000053005300720200001e002b000000ee0b51001e00020000004f00ef0b51001e0002000000810df00b51001e00020000004f00f20b1c001e000400000000000000f30b1c001e000400000000000000f40bf50b1e0006000000010000000000f60bf70b1e0006000000010000000000f80b93001e0006000000010000000000f90bfa0b1e00060000000100000000008800fb0b1e0006000000010000000000fc0bba0b1e0014000000325b58ef971009409bd7129c9e6880f000000000fd0bfe0b1e0006000000010000000000ff0b000c1e0006000000010000000000010c020c1e0006000000010000000000030c020c1e0006000000010000000000040c050c1e0006000000010000000000060c0c001e000400000000000000070c0c001e000400000000000000080c0c001e000400000000000000090c10001e0001000000000a0c10001e0001000000000b0c10001e0001000000000c0c10001e0001000000000d0cdd091e00030000000100000e0cdd091e00030000000100000f0cdd091e0003000000010000100cdd091e0003000000010000110c1c001e000400000000000000120cdd091e0003000000010000130c140c1e0006000000010000000000150c0c001e000400000000000000160c170c1e0006000000010000000000180c8b001e00050000000100000000190c1a0c1e00050000000100000000820027001e0004000000000000001b0cdd091e00030000000100001c0c51001e00020000004f001d0c1c001e0004000000000000001e0c1c001e0004000000000000001f0c1c001e000400000000000000200c1c001e000400000000000000210c1c001e000400000000000000220c1c001e0004000000000000004e00dec0adde",
    "serializedSha256": "89eb7c421bc8b3c0c22f9913141e920f85fbad59537ad12d1d12d8201b2aa676",
    "properties": [
      {
        "name": "Description",
        "type": "bCString",
        "raw": "4f00",
        "value": null,
        "offset": 1186564,
        "sourceOffset": 1186564,
        "recordOffset": 1186554,
        "recordSourceOffset": 1186554,
        "nameStringIndex": 3054,
        "typeStringIndex": 81,
        "magic": 30,
        "byteLength": 2,
        "inlineStrings": false,
        "recordHeaderRaw": "ee0b51001e0002000000"
      },
      {
        "name": "Voice",
        "type": "bCString",
        "raw": "810d",
        "value": null,
        "offset": 1186576,
        "sourceOffset": 1186576,
        "recordOffset": 1186566,
        "recordSourceOffset": 1186566,
        "nameStringIndex": 3055,
        "typeStringIndex": 81,
        "magic": 30,
        "byteLength": 2,
        "inlineStrings": false,
        "recordHeaderRaw": "ef0b51001e0002000000"
      },
      {
        "name": "RoleDescription",
        "type": "bCString",
        "raw": "4f00",
        "value": null,
        "offset": 1186588,
        "sourceOffset": 1186588,
        "recordOffset": 1186578,
        "recordSourceOffset": 1186578,
        "nameStringIndex": 3056,
        "typeStringIndex": 81,
        "magic": 30,
        "byteLength": 2,
        "inlineStrings": false,
        "recordHeaderRaw": "f00b51001e0002000000"
      },
      {
        "name": "Level",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1186600,
        "sourceOffset": 1186600,
        "recordOffset": 1186590,
        "recordSourceOffset": 1186590,
        "nameStringIndex": 3058,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "f20b1c001e0004000000"
      },
      {
        "name": "LevelMax",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1186614,
        "sourceOffset": 1186614,
        "recordOffset": 1186604,
        "recordSourceOffset": 1186604,
        "nameStringIndex": 3059,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "f30b1c001e0004000000"
      },
      {
        "name": "Gender",
        "type": "bTPropertyContainer<enum gEGender>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186628,
        "sourceOffset": 1186628,
        "recordOffset": 1186618,
        "recordSourceOffset": 1186618,
        "nameStringIndex": 3060,
        "typeStringIndex": 3061,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "f40bf50b1e0006000000"
      },
      {
        "name": "Species",
        "type": "bTPropertyContainer<enum gESpecies>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186644,
        "sourceOffset": 1186644,
        "recordOffset": 1186634,
        "recordSourceOffset": 1186634,
        "nameStringIndex": 3062,
        "typeStringIndex": 3063,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "f60bf70b1e0006000000"
      },
      {
        "name": "PoliticalAlignment",
        "type": "bTPropertyContainer<enum gEPoliticalAlignment>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186660,
        "sourceOffset": 1186660,
        "recordOffset": 1186650,
        "recordSourceOffset": 1186650,
        "nameStringIndex": 3064,
        "typeStringIndex": 147,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "f80b93001e0006000000"
      },
      {
        "name": "Class",
        "type": "bTPropertyContainer<enum gEClass>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186676,
        "sourceOffset": 1186676,
        "recordOffset": 1186666,
        "recordSourceOffset": 1186666,
        "nameStringIndex": 3065,
        "typeStringIndex": 3066,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "f90bfa0b1e0006000000"
      },
      {
        "name": "Type",
        "type": "bTPropertyContainer<enum gENPCType>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186692,
        "sourceOffset": 1186692,
        "recordOffset": 1186682,
        "recordSourceOffset": 1186682,
        "nameStringIndex": 136,
        "typeStringIndex": 3067,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "8800fb0b1e0006000000"
      },
      {
        "name": "Enclave",
        "type": "bCPropertyID",
        "raw": "325b58ef971009409bd7129c9e6880f000000000",
        "value": null,
        "offset": 1186708,
        "sourceOffset": 1186708,
        "recordOffset": 1186698,
        "recordSourceOffset": 1186698,
        "nameStringIndex": 3068,
        "typeStringIndex": 3002,
        "magic": 30,
        "byteLength": 20,
        "inlineStrings": false,
        "recordHeaderRaw": "fc0bba0b1e0014000000"
      },
      {
        "name": "AttitudeToPlayer2",
        "type": "bTPropertyContainer<enum gEAttitude>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186738,
        "sourceOffset": 1186738,
        "recordOffset": 1186728,
        "recordSourceOffset": 1186728,
        "nameStringIndex": 3069,
        "typeStringIndex": 3070,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "fd0bfe0b1e0006000000"
      },
      {
        "name": "LastPlayerCrime",
        "type": "bTPropertyContainer<enum gEPlayerCrime>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186754,
        "sourceOffset": 1186754,
        "recordOffset": 1186744,
        "recordSourceOffset": 1186744,
        "nameStringIndex": 3071,
        "typeStringIndex": 3072,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "ff0b000c1e0006000000"
      },
      {
        "name": "AttackReason",
        "type": "bTPropertyContainer<enum gEAttackReason>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186770,
        "sourceOffset": 1186770,
        "recordOffset": 1186760,
        "recordSourceOffset": 1186760,
        "nameStringIndex": 3073,
        "typeStringIndex": 3074,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "010c020c1e0006000000"
      },
      {
        "name": "LastPlayerAR",
        "type": "bTPropertyContainer<enum gEAttackReason>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186786,
        "sourceOffset": 1186786,
        "recordOffset": 1186776,
        "recordSourceOffset": 1186776,
        "nameStringIndex": 3075,
        "typeStringIndex": 3074,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "030c020c1e0006000000"
      },
      {
        "name": "LastFightAgainstPlayer",
        "type": "bTPropertyContainer<enum gELastFightAgainstPlayer>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186802,
        "sourceOffset": 1186802,
        "recordOffset": 1186792,
        "recordSourceOffset": 1186792,
        "nameStringIndex": 3076,
        "typeStringIndex": 3077,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "040c050c1e0006000000"
      },
      {
        "name": "LastFightTimestamp",
        "type": "float",
        "raw": "00000000",
        "value": null,
        "offset": 1186818,
        "sourceOffset": 1186818,
        "recordOffset": 1186808,
        "recordSourceOffset": 1186808,
        "nameStringIndex": 3078,
        "typeStringIndex": 12,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "060c0c001e0004000000"
      },
      {
        "name": "LastDistToTarget",
        "type": "float",
        "raw": "00000000",
        "value": null,
        "offset": 1186832,
        "sourceOffset": 1186832,
        "recordOffset": 1186822,
        "recordSourceOffset": 1186822,
        "nameStringIndex": 3079,
        "typeStringIndex": 12,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "070c0c001e0004000000"
      },
      {
        "name": "DistToNearestMist",
        "type": "float",
        "raw": "00000000",
        "value": null,
        "offset": 1186846,
        "sourceOffset": 1186846,
        "recordOffset": 1186836,
        "recordSourceOffset": 1186836,
        "nameStringIndex": 3080,
        "typeStringIndex": 12,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "080c0c001e0004000000"
      },
      {
        "name": "DefeatedByPlayer",
        "type": "bool",
        "raw": "00",
        "value": null,
        "offset": 1186860,
        "sourceOffset": 1186860,
        "recordOffset": 1186850,
        "recordSourceOffset": 1186850,
        "nameStringIndex": 3081,
        "typeStringIndex": 16,
        "magic": 30,
        "byteLength": 1,
        "inlineStrings": false,
        "recordHeaderRaw": "090c10001e0001000000"
      },
      {
        "name": "Ransacked",
        "type": "bool",
        "raw": "00",
        "value": null,
        "offset": 1186871,
        "sourceOffset": 1186871,
        "recordOffset": 1186861,
        "recordSourceOffset": 1186861,
        "nameStringIndex": 3082,
        "typeStringIndex": 16,
        "magic": 30,
        "byteLength": 1,
        "inlineStrings": false,
        "recordHeaderRaw": "0a0c10001e0001000000"
      },
      {
        "name": "Discovered",
        "type": "bool",
        "raw": "00",
        "value": null,
        "offset": 1186882,
        "sourceOffset": 1186882,
        "recordOffset": 1186872,
        "recordSourceOffset": 1186872,
        "nameStringIndex": 3083,
        "typeStringIndex": 16,
        "magic": 30,
        "byteLength": 1,
        "inlineStrings": false,
        "recordHeaderRaw": "0b0c10001e0001000000"
      },
      {
        "name": "LastFightComment",
        "type": "bool",
        "raw": "00",
        "value": null,
        "offset": 1186893,
        "sourceOffset": 1186893,
        "recordOffset": 1186883,
        "recordSourceOffset": 1186883,
        "nameStringIndex": 3084,
        "typeStringIndex": 16,
        "magic": 30,
        "byteLength": 1,
        "inlineStrings": false,
        "recordHeaderRaw": "0c0c10001e0001000000"
      },
      {
        "name": "CurrentTargetEntity",
        "type": "eCEntityProxy",
        "raw": "010000",
        "value": null,
        "offset": 1186904,
        "sourceOffset": 1186904,
        "recordOffset": 1186894,
        "recordSourceOffset": 1186894,
        "nameStringIndex": 3085,
        "typeStringIndex": 2525,
        "magic": 30,
        "byteLength": 3,
        "inlineStrings": false,
        "recordHeaderRaw": "0d0cdd091e0003000000"
      },
      {
        "name": "CurrentAttackerEntity",
        "type": "eCEntityProxy",
        "raw": "010000",
        "value": null,
        "offset": 1186917,
        "sourceOffset": 1186917,
        "recordOffset": 1186907,
        "recordSourceOffset": 1186907,
        "nameStringIndex": 3086,
        "typeStringIndex": 2525,
        "magic": 30,
        "byteLength": 3,
        "inlineStrings": false,
        "recordHeaderRaw": "0e0cdd091e0003000000"
      },
      {
        "name": "AlternativeTargetEntity",
        "type": "eCEntityProxy",
        "raw": "010000",
        "value": null,
        "offset": 1186930,
        "sourceOffset": 1186930,
        "recordOffset": 1186920,
        "recordSourceOffset": 1186920,
        "nameStringIndex": 3087,
        "typeStringIndex": 2525,
        "magic": 30,
        "byteLength": 3,
        "inlineStrings": false,
        "recordHeaderRaw": "0f0cdd091e0003000000"
      },
      {
        "name": "LastAttackerEntity",
        "type": "eCEntityProxy",
        "raw": "010000",
        "value": null,
        "offset": 1186943,
        "sourceOffset": 1186943,
        "recordOffset": 1186933,
        "recordSourceOffset": 1186933,
        "nameStringIndex": 3088,
        "typeStringIndex": 2525,
        "magic": 30,
        "byteLength": 3,
        "inlineStrings": false,
        "recordHeaderRaw": "100cdd091e0003000000"
      },
      {
        "name": "CombatState",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1186956,
        "sourceOffset": 1186956,
        "recordOffset": 1186946,
        "recordSourceOffset": 1186946,
        "nameStringIndex": 3089,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "110c1c001e0004000000"
      },
      {
        "name": "GuardPoint",
        "type": "eCEntityProxy",
        "raw": "010000",
        "value": null,
        "offset": 1186970,
        "sourceOffset": 1186970,
        "recordOffset": 1186960,
        "recordSourceOffset": 1186960,
        "nameStringIndex": 3090,
        "typeStringIndex": 2525,
        "magic": 30,
        "byteLength": 3,
        "inlineStrings": false,
        "recordHeaderRaw": "120cdd091e0003000000"
      },
      {
        "name": "GuardStatus",
        "type": "bTPropertyContainer<enum gEGuardStatus>",
        "raw": "010000000000",
        "value": null,
        "offset": 1186983,
        "sourceOffset": 1186983,
        "recordOffset": 1186973,
        "recordSourceOffset": 1186973,
        "nameStringIndex": 3091,
        "typeStringIndex": 3092,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "130c140c1e0006000000"
      },
      {
        "name": "LastDistToGuardPoint",
        "type": "float",
        "raw": "00000000",
        "value": null,
        "offset": 1186999,
        "sourceOffset": 1186999,
        "recordOffset": 1186989,
        "recordSourceOffset": 1186989,
        "nameStringIndex": 3093,
        "typeStringIndex": 12,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "150c0c001e0004000000"
      },
      {
        "name": "Bearing",
        "type": "bTPropertyContainer<enum gEBearing>",
        "raw": "010000000000",
        "value": null,
        "offset": 1187013,
        "sourceOffset": 1187013,
        "recordOffset": 1187003,
        "recordSourceOffset": 1187003,
        "nameStringIndex": 3094,
        "typeStringIndex": 3095,
        "magic": 30,
        "byteLength": 6,
        "inlineStrings": false,
        "recordHeaderRaw": "160c170c1e0006000000"
      },
      {
        "name": "TeachAttribs",
        "type": "bTObjArray<class bCString>",
        "raw": "0100000000",
        "value": null,
        "offset": 1187029,
        "sourceOffset": 1187029,
        "recordOffset": 1187019,
        "recordSourceOffset": 1187019,
        "nameStringIndex": 3096,
        "typeStringIndex": 139,
        "magic": 30,
        "byteLength": 5,
        "inlineStrings": false,
        "recordHeaderRaw": "180c8b001e0005000000"
      },
      {
        "name": "TeachSkills",
        "type": "bTObjArray<class eCTemplateEntityProxy>",
        "raw": "0100000000",
        "value": null,
        "offset": 1187044,
        "sourceOffset": 1187044,
        "recordOffset": 1187034,
        "recordSourceOffset": 1187034,
        "nameStringIndex": 3097,
        "typeStringIndex": 3098,
        "magic": 30,
        "byteLength": 5,
        "inlineStrings": false,
        "recordHeaderRaw": "190c1a0c1e0005000000"
      },
      {
        "name": "ManaUsed",
        "type": "int",
        "raw": "00000000",
        "value": null,
        "offset": 1187059,
        "sourceOffset": 1187059,
        "recordOffset": 1187049,
        "recordSourceOffset": 1187049,
        "nameStringIndex": 130,
        "typeStringIndex": 39,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "820027001e0004000000"
      },
      {
        "name": "SpellTarget",
        "type": "eCEntityProxy",
        "raw": "010000",
        "value": null,
        "offset": 1187073,
        "sourceOffset": 1187073,
        "recordOffset": 1187063,
        "recordSourceOffset": 1187063,
        "nameStringIndex": 3099,
        "typeStringIndex": 2525,
        "magic": 30,
        "byteLength": 3,
        "inlineStrings": false,
        "recordHeaderRaw": "1b0cdd091e0003000000"
      },
      {
        "name": "LastSpell",
        "type": "bCString",
        "raw": "4f00",
        "value": null,
        "offset": 1187086,
        "sourceOffset": 1187086,
        "recordOffset": 1187076,
        "recordSourceOffset": 1187076,
        "nameStringIndex": 3100,
        "typeStringIndex": 81,
        "magic": 30,
        "byteLength": 2,
        "inlineStrings": false,
        "recordHeaderRaw": "1c0c51001e0002000000"
      },
      {
        "name": "StatusEffects",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1187098,
        "sourceOffset": 1187098,
        "recordOffset": 1187088,
        "recordSourceOffset": 1187088,
        "nameStringIndex": 3101,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "1d0c1c001e0004000000"
      },
      {
        "name": "TimeStampFrozen",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1187112,
        "sourceOffset": 1187112,
        "recordOffset": 1187102,
        "recordSourceOffset": 1187102,
        "nameStringIndex": 3102,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "1e0c1c001e0004000000"
      },
      {
        "name": "TimeStampBurning",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1187126,
        "sourceOffset": 1187126,
        "recordOffset": 1187116,
        "recordSourceOffset": 1187116,
        "nameStringIndex": 3103,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "1f0c1c001e0004000000"
      },
      {
        "name": "TimeStampPoisoned",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1187140,
        "sourceOffset": 1187140,
        "recordOffset": 1187130,
        "recordSourceOffset": 1187130,
        "nameStringIndex": 3104,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "200c1c001e0004000000"
      },
      {
        "name": "TimeStampDiseased",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1187154,
        "sourceOffset": 1187154,
        "recordOffset": 1187144,
        "recordSourceOffset": 1187144,
        "nameStringIndex": 3105,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "210c1c001e0004000000"
      },
      {
        "name": "TimeStampTransformed",
        "type": "long",
        "raw": "00000000",
        "value": null,
        "offset": 1187168,
        "sourceOffset": 1187168,
        "recordOffset": 1187158,
        "recordSourceOffset": 1187158,
        "nameStringIndex": 3106,
        "typeStringIndex": 28,
        "magic": 30,
        "byteLength": 4,
        "inlineStrings": false,
        "recordHeaderRaw": "220c1c001e0004000000"
      }
    ],
    "tailRaw": "",
    "nativeReadOffset": 1187172,
    "worldResident": false
  },
  "nativeTailRaw": "4e00",
  "profile": {
    "allocation": "fresh successful wrapper/native capability allocation; numeric heap pointers remain masked",
    "enumGlobals": "live masked DWORD copy; cold PE bytes are not live defaults",
    "derivedRead": "all versions consume u16 then reset ManaUsed+158 to0; no inherited read",
    "worldResident": false,
    "unresolved": [
      "actual indexed CString stream ownership/copy service",
      "CoCreateGuid platform service",
      "nonempty teaching array allocation/destruction",
      "animation/TrackCurrentPose body after the proven pending-pose fast branch",
      "local NotifyExit temporary CString ownership",
      "terminal destruction and world registration"
    ]
  },
  "obsoleteReader": {
    "npcStub": "Game:20016be4",
    "stubBytes": "e917642e00",
    "target": "Game:202fd000",
    "equivalentBody": "Game:2031fe50",
    "bodyBytes": 192,
    "bodySha256": "ac7a65d11aea9f4e1ff69afde164a9e793328cf767554d673f8d901c6bb43744",
    "byteIdenticalToPlayerMemoryReader": true,
    "recordLayout": "u16 version, u32 byte length, opaque payload"
  }
}
`);if(B.schema!==`gothic3-npc-reading-rules-v1`||B.propertyType!==30||B.getVersion!==78||B.nativeBytes!==508||B.nativeVtable!==`2069668c`||B.wrapperVtable!==`20695ac4`||B.fields.length!==43||B.obsoleteReader.npcStub!==`Game:20016be4`||B.obsoleteReader.stubBytes!==`e917642e00`||B.obsoleteReader.target!==`Game:202fd000`||B.obsoleteReader.equivalentBody!==`Game:2031fe50`||B.obsoleteReader.bodyBytes!==192||B.obsoleteReader.bodySha256!==`ac7a65d11aea9f4e1ff69afde164a9e793328cf767554d673f8d901c6bb43744`||!B.obsoleteReader.byteIdenticalToPlayerMemoryReader||B.obsoleteReader.recordLayout!==`u16 version, u32 byte length, opaque payload`||B.inputs.Game!==`b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f`||B.inputs.Engine!==`d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3`||B.inputs.SharedBase!==`5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214`)throw Error(`Original NPC source evidence differs`);var jo=e=>({known:!0,value:e}),Mo=e=>({known:!1,reason:e}),No=Symbol(`actual guarded NPC native virtual Read`);function Po(e,t){if(!e.known)throw Error(t+`: `+e.reason);return e.value}function Fo(e,t=4294967295){if(!Number.isInteger(e)||e<0||e>t)throw Error(`Original unsigned NPC field value required`);return e}function Io(e){if(!/^[0-9a-f]{40}$/i.test(e))throw Error(`Actual 20-byte NPC PropertyID required`);return Uint8Array.from(e.match(/../g),e=>parseInt(e,16))}function Lo(e){return[...e].map(e=>e.toString(16).padStart(2,`0`)).join(``)}var Ro={initialized:!1,registered:!1,locked:!1},zo=class{nativeOffset;properties;current=null;constructor(e,t){this.nativeOffset=e,this.properties=t}get pointer(){return this.current}set pointer(e){if(this.properties.reader.guard(),e!==null&&(e.freed||!e.identity||!Number.isInteger(e.length)||e.length<0||e.length!==e.text.length||!Number.isInteger(e.referenceCount)||e.referenceCount<0||e.referenceCount>65535))throw Error(`Actual original CString allocation required`);this.current=e,this.properties.pointerBits(this.nativeOffset,e),this.properties.reader.note(`captured CString pointer assignment+`+this.nativeOffset.toString(16),`SharedBase:1001ee90`)}get text(){let e=this.current;if(e===null)return``;if(e.freed)throw Error(`NPC CString pointer refers to a freed allocation`);return e.text}clear(){this.properties.reader.guard();let e=this.current;if(e!==null&&e.length!==0){if(e.freed)throw Error(`Actual live CString Clear allocation required`);e.referenceCount=Fo(e.referenceCount,65535)-1&65535,this.properties.reader.note(`CString.Clear captured ushort ref decrement`,`SharedBase:100149b0`),e.referenceCount===0&&(this.properties.reader.call(`CString.Clear MemoryAdmin.Free captured allocation`,`SharedBase:100149b0`,()=>this.properties.reader.host.freeCString?.(e)),e.freed=!0),this.current=null,this.properties.pointerBits(this.nativeOffset,null),this.properties.reader.note(`CString.Clear pointer NULL after release`,`SharedBase:100149b0`)}}},Bo=class extends pa{nativeOffset;properties;actualInternal=null;guardedInternal=null;constructor(e,t){super(`0000000000000000000000000000000000000000`,null),this.nativeOffset=e,this.properties=t,Object.defineProperty(this,"id",{get:()=>(t.require(e+8,20),Lo(t.numericBytes.subarray(e+8,e+28))),set:n=>{t.raw(e+8,Io(n))}}),Object.defineProperty(this,"internal",{get:()=>this.guardedInternal,set:t=>{this.properties.reader.guard(),this.actualInternal=t,this.guardedInternal=t===null?null:{identity:t.identity,releaseReference:()=>this.properties.reader.controller.value(()=>{this.properties.reader.call(`captured EntityProxyInternal.ReleaseReference`,`Engine:304c43a0`,()=>t.releaseReference())})},this.properties.pointerBits(e+4,t)}})}get nativeInternal(){return this.actualInternal}trace(e,t,n){this.properties.reader.guard(),this.properties.reader.note(e+` embedded+`+this.nativeOffset.toString(16),`Engine:304c43a0`),n(e,t),this.properties.reader.guard()}setEntity(e,t=()=>{}){this.properties.reader.guard(),super.setEntity(e,(e,n)=>this.trace(e,n,t)),this.properties.reader.guard()}clearEntityPointer(e=()=>{}){this.properties.reader.guard(),super.clearEntityPointer((t,n)=>this.trace(t,n,e)),this.properties.reader.guard()}},Vo=class{wrapper;reader;numericBytes=new Uint8Array(508);knownMask=new Uint8Array(508);view=new DataView(this.numericBytes.buffer);values={};base;notifications;strings=new Map;proxies=new Map;arrays=new Map;obsoleteProperties=new Map;guidScratch=[];enclaveProxy;owner=null;propertyObject=null;constructed=!1;constructor(e,t){this.wrapper=e,this.reader=t,this.enclaveProxy=new Bo(452,this),this.proxies.set(452,this.enclaveProxy),this.base=new wa(e.identity+`:native`,`gCNPC_PS`,30,this.values,{read:()=>this.owner,write:e=>{this.reader.guard(),this.owner=e,this.pointerBits(12,e)}},null,{added:e=>this.emptyCallback(e,`Engine:30481830`),removed:e=>this.emptyCallback(e,`Engine:30481840`),postRead:e=>this.reader.run(()=>{if(this.exact(),e!==this.base)throw Error(`Actual NPC PostRead receiver required`);this.postReadInternal()})},()=>jo(!0)),Object.defineProperty(this.base,"referenceWord",{get:()=>this.dword(8),set:e=>this.putWord(8,e)}),Object.defineProperty(this.base,"wrapper",{get:()=>this.propertyObject,set:e=>{this.reader.guard(),this.propertyObject=e,this.pointerBits(4,e)}}),Object.defineProperties(this.base.baseFlags,{value:{get:()=>this.view.getUint8(16),set:e=>{this.reader.guard(),this.view.setUint8(16,Fo(e,255))}},knownMask:{get:()=>this.knownMask[16],set:e=>{this.reader.guard(),this.knownMask[16]=Fo(e,255)}}}),this.notifications=new ma(this.base.identity,`gCNPC_PS`,this.values,null,this.enclaveProxy),Object.defineProperty(this.notifications,"owner",{get:()=>this.owner?.propertyOwner??null,set:e=>{throw Error(`NPC notifications owner follows actual physical EntityPS.owner`)}});for(let e of B.fields)this.bindValue(e)}require(e,t){if(!this.knownMask.subarray(e,e+t).every(e=>e===255))throw Error(`NPC field bits remain unknown+`+e.toString(16))}putWord(e,t){this.reader.guard(),this.view.setUint32(e,Fo(t),!0),this.knownMask.fill(255,e,e+4)}dword(e){return this.require(e,4),this.view.getUint32(e,!0)}raw(e,t,n){if(this.reader.guard(),e<0||e+t.length>this.numericBytes.length||n&&n.length!==t.length)throw Error(`Actual NPC physical write bounds required`);this.numericBytes.set(t,e),n?this.knownMask.set(n,e):this.knownMask.fill(255,e,e+t.length)}pointerBits(e,t){this.reader.guard(),t===null?this.putWord(e,0):this.knownMask.fill(0,e,e+4)}putByte(e,t){this.reader.guard(),this.view.setUint8(e,Fo(t,255)),this.knownMask[e]=255}bindValue(e){let t=e.nativeOffset;Object.defineProperty(this.values,e.name,{enumerable:!0,get:()=>{if(e.enum)return this.dword(t+4);if(e.typeName===`bCString`){let e=this.strings.get(t);if(!e)throw Error(`NPC CString not constructed`);return e.text}if(e.typeName===`bCPropertyID`)return this.require(t,20),Lo(this.numericBytes.subarray(t,t+20));if(e.typeName===`eCEntityProxy`){let e=this.proxies.get(t);if(!e)throw Error(`NPC proxy not constructed`);return e}if(e.typeName.startsWith(`bTObjArray<`)){let e=this.arrays.get(t);if(!e)throw Error(`NPC teaching array not constructed`);return e}return e.typeName===`bool`?(this.require(t,1),this.view.getUint8(t)!==0):e.typeName===`float`?(this.require(t,4),this.view.getFloat32(t,!0)):e.typeName===`int`?(this.require(t,4),this.view.getInt32(t,!0)):this.dword(t)},set:n=>{if(this.reader.guard(),this.exact(),e.enum||e.typeName===`unsigned_long`)this.putWord(t+(e.enum?4:0),Fo(n));else if(e.typeName===`int`){if(!Number.isInteger(n)||n<-2147483648||n>2147483647)throw Error(`Actual NPC int32 required`);this.putWord(t,n>>>0)}else if(e.typeName===`bool`){if(typeof n!=`boolean`)throw Error(`Actual NPC bool required`);this.putByte(t,Number(n))}else if(e.typeName===`float`){if(typeof n!=`number`||!Number.isFinite(n)||!Object.is(n,Math.fround(n)))throw Error(`Finite original float32 setter profile required`);this.view.setFloat32(t,n,!0),this.knownMask.fill(255,t,t+4)}else if(e.typeName===`bCPropertyID`){let e=Io(n);this.raw(t,e.subarray(0,16)),this.putWord(t+16,0)}else throw Error(`NPC owned CString/proxy/array setters require their actual object service`)}})}exact(e=!0){if(this.base.values!==this.values||this.notifications.values!==this.values||this.wrapper.deleted||e&&(this.wrapper.native!==this.base||this.base.wrapper!==this.wrapper))throw Error(`Actual retained NPC physical PS required`)}emptyCallback(e,t){return this.reader.run(()=>{if(this.exact(),e!==this.base)throw Error(`Actual NPC lifecycle receiver required`);this.reader.note(`actual inherited empty NPC lifecycle callback`,t)})}copyEnum(e){let t=e.enum,n=this.reader.host.enumDefault?this.reader.call(`copy CURRENT mutable enum default `+t.global,t.nativeDefault,()=>this.reader.host.enumDefault(t.global)):{value:0,knownMask:0},r=Fo(n.value),i=Fo(n.knownMask),a=new Uint8Array(4),o=new Uint8Array(4);new DataView(a.buffer).setUint32(0,r,!0),new DataView(o.buffer).setUint32(0,i,!0),this.raw(t.valueOffset,a,o),this.reader.note(`masked live enum copy `+e.name,t.nativeDefault)}constructString(e){this.strings.set(e,new zo(e,this)),this.putWord(e,0),this.reader.note(`CString constructor pointer NULL+`+e.toString(16),`SharedBase:10012d20`)}constructProxy(e){let t=e===452?this.enclaveProxy:new Bo(e,this);this.proxies.set(e,t),this.putWord(e,814202868),this.raw(e+8,new Uint8Array(20)),this.putWord(e+4,0),this.raw(e+8,new Uint8Array(20)),this.reader.note(`actual embedded EntityProxy ctor+`+e.toString(16),`Engine:3001d7b9`)}construct(){if(this.reader.guard(),this.exact(!1),this.constructed)throw Error(`Fresh NPC constructor receiver required`);this.constructed=!0,this.putWord(0,543778444),this.putWord(4,0),this.putWord(8,1),this.putWord(12,0),this.view.setUint8(16,1),this.knownMask[16]=15,this.reader.note(`inherited RefBase/EntityPS constructor and actual NPC vtable`,`Game:202f9e80`),this.reader.controller.retainNative(this.wrapper,this.base);for(let e of[20,24,28])this.constructString(e);for(let e of B.fields.filter(e=>e.enum&&e.nativeOffset<=72))this.putWord(e.nativeOffset,parseInt(e.enum.vtable,16)),this.copyEnum(e);this.raw(80,new Uint8Array(20)),this.reader.note(`Enclave PropertyID constructor zero20`,`Game:202f9e80`);for(let e of B.fields.filter(e=>e.enum&&e.nativeOffset>=100&&e.nativeOffset<=132))this.putWord(e.nativeOffset,parseInt(e.enum.vtable,16)),this.copyEnum(e);for(let e of[156,184,212,240,272])this.constructProxy(e);for(let e of B.fields.filter(e=>e.enum&&e.nativeOffset>=300))this.putWord(e.nativeOffset,parseInt(e.enum.vtable,16)),this.copyEnum(e);for(let[e,t]of[[320,`CString`],[332,`TemplateEntityProxy`]]){let n=null,r={nativeOffset:e,kind:t,allocation:null,count:0,capacity:0};Object.defineProperties(r,{allocation:{get:()=>n,set:t=>{this.reader.guard(),n=t,this.pointerBits(e,t)}},count:{get:()=>this.dword(e+4),set:t=>this.putWord(e+4,t)},capacity:{get:()=>this.dword(e+8),set:t=>this.putWord(e+8,t)}}),this.arrays.set(e,r),this.raw(e,new Uint8Array(12)),this.reader.note(`real empty teaching ObjArray header+`+e.toString(16),`Game:202f9e80`)}this.constructProxy(348),this.constructString(376),this.constructString(416);for(let e of[424,452,480])this.constructProxy(e);this.resetFields(`Game:202f9e80`)}resetFields(e){for(let t of[420,344,380,396,400,384,388,392])this.putWord(t,0),this.reader.note(`NPC derived reset DWORD+`+t.toString(16),e)}invalidate(){return this.reader.run(()=>{this.exact(),this.resetFields(`Game:202f8df0`)})}gameReset(){return this.reader.run(()=>{this.exact(),this.putWord(420,0),this.reader.note(`GameReset pending pose0`,`Game:202f8e30`)})}assignDefault(e){return this.reader.run(()=>Po(this.assignDefaultInternal(e,No),`NPC descriptor default`))}assignDefaultInternal(e,t){return this.reader.controller.value(()=>{if(t!==No)throw Error(`Actual guarded NPC descriptor default required`);this.reader.guard(),this.exact();let n=this.descriptor(e),r=n.nativeOffset;if(n.enum)this.copyEnum(n);else if(n.typeName===`bCString`)this.strings.get(r).clear();else if(n.typeName===`bCPropertyID`){let e={bytes:new Uint8Array(20),knownMask:new Uint8Array(20),destroyed:!1};e.knownMask[16]=255,this.guidScratch.push(e),this.reader.note(`temporary Guid constructor validity byte0 only`,`SharedBase:100063c5`),this.reader.call(`CoCreateGuid captured scratch, HRESULT ignored`,`SharedBase:10012570`,()=>this.reader.host.coCreateGuid?.(e)),e.bytes[16]=1,e.knownMask[16]=255,this.reader.note(`Guid.Generate validity byte1`,`SharedBase:10012570`),this.raw(r,e.bytes.subarray(0,16),e.knownMask.subarray(0,16)),this.putWord(r+16,0),this.reader.note(`captured PropertyID CreateRandom copy16/cache0`,`SharedBase:10092760`),e.destroyed=!0,this.reader.note(`actual temporary Guid destructor RET`,`SharedBase:10092760`)}else if(n.typeName===`bool`)this.putByte(r,0);else if(n.typeName===`float`||n.typeName===`unsigned_long`)this.putWord(r,0);else if(n.typeName===`int`)this.putWord(r,4294967295);else if(n.typeName!==`eCEntityProxy`&&!n.typeName.startsWith(`bTObjArray<`))throw Error(`Unresolved actual NPC default`);this.reader.note(`descriptor default `+e.name,n.default),this.reader.guard()})}descriptor(e){let t=B.fields.find(t=>t.name===e.name);if(!t||t.typeName!==e.typeName||t.nativeOffset!==e.nativeOffset||t.reader!==e.reader)throw Error(`Exact original NPC descriptor required`);return t}propagatedNotify(e,t,n=!0){let r=this.notifications.notify(e,t,n);for(let n of r.trace)this.reader.note(n.operation+` `+t,e===`enter`?`Engine:3003b5bb`:`Game:202f8d90`);if(!r.supported)throw Error(r.reason);this.reader.guard()}readField(e,t){return this.reader.run(()=>Po(this.readFieldInternal(e,t,No),`NPC descriptor reader`))}readFieldInternal(e,t,n){return this.reader.controller.value(()=>{if(n!==No)throw Error(`Actual guarded NPC descriptor reader required`);this.reader.guard(),this.exact();let r=this.descriptor(e),i=r.nativeOffset,a=t.u16();if(t.u32(),this.reader.note(`descriptor version/size consumed; no forced seek `+e.name,r.reader),this.propagatedNotify(`enter`,e.name),this.exact(),r.enum)t.u16(),this.raw(i+4,t.take(4));else if(r.typeName===`bCString`)this.reader.call(`actual indexed stream Read captured CString `+e.name,`SharedBase:1001ee90`,()=>this.reader.host.readCString?.(this.strings.get(i),t));else if(r.typeName===`bCPropertyID`){let e=t.take(20);this.raw(i,e.subarray(0,16)),this.putWord(i+16,0)}else if(r.typeName===`eCEntityProxy`){let e=this.proxies.get(i);if(t.u16(),t.bool()){this.reader.note(`proxy Read temporary PropertyID constructor zero20`,`Engine:304c4410`);let n=t.propertyID().slice(0,32)+`00000000`;e.setEntity(n),this.reader.note(`proxy Read temporary PropertyID destructor RET`,`Engine:304c4410`)}else e.clearEntityPointer()}else if(r.typeName.startsWith(`bTObjArray<`)){if(a>=30){let e=this.arrays.get(i);if(t.u8(),t.u32()!==0||e.count!==0||e.capacity!==0||e.allocation!==null)throw Error(`Actual nonempty/reused NPC teaching array allocation/destruction unresolved`);e.count=0,this.reader.note(`real teaching array count0 read`,r.typeName.includes(`bCString`)?`Game:2028f890`:`Game:2030bd70`)}}else if(r.typeName===`bool`)this.putByte(i,Number(t.bool()));else if([`float`,`unsigned_long`,`int`].includes(r.typeName))this.raw(i,t.take(4));else throw Error(`Actual NPC descriptor payload unresolved`);this.reader.note(`actual reflected payload `+e.name,r.reader),this.reader.guard(),this.exact(),this.propagatedNotify(`exit`,e.name)})}readNative(e){return this.reader.run(()=>Po(this.readNativeInternal(e,No),`NPC derived Read`))}readNativeInternal(e,t){return this.reader.controller.value(()=>{if(t!==No)throw Error(`Actual guarded NPC derived Read required`);this.reader.guard(),this.exact(),e.u16(),this.reader.note(`NPC native Read version consumed, no version branch`,`Game:202f9940`),this.putWord(344,0),this.reader.note(`NPC native Read ManaUsed0`,`Game:202f9940`)})}readObsoletePropertyInternal(e,t,n,r){return this.reader.controller.value(()=>{if(this.reader.guard(),this.exact(),Ro.locked)throw Error(`Reentrant native NPC obsolete-property critical section is unsupported`);Ro.initialized||(Ro.initialized=!0,this.reader.note(`one-time bCCriticalSectionWin32 initialization for obsolete NPC properties`,`Game:20312d30`)),Ro.locked=!0,this.reader.note(`Acquire obsolete NPC property critical section`,`Game:20312d30`);try{Ro.registered||=(this.reader.note(`construct and register bTPropertyType<gCNPC_PS,bCObsoleteClass>`,`Game:20312d30`),!0);let i=r.u16(),a=r.u32(),o=r.take(a).slice();this.reader.note(`bCObsoleteClass::Read version and payload length; MemoryAdmin.Malloc + stream read`,`Game:2031fe50`),n?(this.reader.note(`bCMemoryStream construction/Write/SetPosition(0)`,`Game:2031fe50`),this.obsoleteProperties.set(e,Object.freeze({name:e,typeName:t,version:i,payload:o})),this.reader.note(`owning property object SetProperty for matching name; memory-stream destructor`,`Game:2031fe50`)):this.reader.note(`bCObsoleteClass consumed unregistered property without memory-stream SetProperty`,`Game:2031fe50`),this.reader.note(`MemoryAdmin.Free obsolete payload buffer`,`Game:2031fe50`),this.reader.guard(),this.exact()}finally{Ro.locked=!1,this.reader.note(`Release obsolete NPC property critical section`,`Game:20312d30`)}})}postReadInternal(){this.putWord(420,0),this.reader.note(`NPC PostRead pending pose0 BEFORE Enclave proxy update`,`Game:202f9ca0`);let e=this.values.Enclave;this.enclaveProxy.setEntity(e),this.reader.note(`NPC PostRead inherited RET`,`Engine:304818a0`)}notify(e,t,n){return this.reader.run(()=>{if(this.exact(),e!==`enter`&&e!==`exit`||typeof n!=`boolean`||typeof t!=`string`||t.includes(`\0`))throw Error(`Actual original NPC property notification arguments required`);if(e===`enter`||n){this.propagatedNotify(e,t,n);return}let r=this.owner;r!==null&&(r.propertyOwner.modified(),this.reader.note(`NotifyExit outer live owner Modified read`,`Engine:3001a091`));let i=this.reader.call(`local NPC OnNotifyExit temporary CString constructor`,`Game:202f8d90`,()=>this.reader.host.constructPropertyName?.(t)),a=this.reader.call(`local NPC temporary CString compare Enclave`,`Game:202f8d90`,()=>i.compare(`Enclave`));this.reader.call(`local NPC temporary CString destructor BEFORE proxy`,`Game:202f8d90`,()=>this.reader.host.destroyPropertyName?.(i)),a&&this.enclaveProxy.setEntity(this.values.Enclave);let o=this.notifications.onNotify(`exit`,t,!0);for(let e of o.trace)this.reader.note(e.operation+` inherited exit`,`Engine:30037ca4`);if(!o.supported)throw Error(o.reason)})}setLevel(e){return this.reader.run(()=>{this.exact(),Fo(e);let t=this.values.Level;if(typeof t!=`number`||!Number.isInteger(t)||t<0||t>4294967295)throw Error(`Resolved native Hero Level required`);t!==e&&(this.values.Level=e,this.reader.note(`GiveXP PropertyLevel::operator=(unsigned_long) scalar write`,`Script_Game:100628c0`))})}process(){return this.reader.run(()=>{this.exact(),this.reader.note(`NPC OnProcess inherited actual RET`,`Engine:304818e0`);let e=this.dword(420);if(e!==0){this.putWord(420,0),this.reader.note(`TrackCurrentPose captured pending clear`,`Game:202f90c0`),this.putWord(404,e),this.reader.note(`TrackCurrentPose first pose write`,`Game:202f90c0`),this.putWord(408,e),this.reader.note(`TrackCurrentPose second pose write`,`Game:202f90c0`);return}let t=this.owner;if(t===null)throw Error(`TrackCurrentPose requires actual nonNULL owner before GetPropertySet100`);this.reader.call(`actual animation-backed TrackCurrentPose remainder`,`Game:202f90c0`,()=>this.reader.host.trackCurrentPose?.(this,t))})}},Ho=class{controller;host;factory;retained=new WeakMap;active=!1;nestedAttempt=!1;constructor(e,t={}){this.controller=e,this.host=t,this.factory={nativeCategory:`entity-property-set`,root:Object.freeze({className:`gCNPC_PS`,baseClassName:`eCEntityPropertySet`,fields:Object.freeze(B.fields.map(e=>Object.freeze({...e})))}),cloneRoot:t=>t===e?this.run(()=>this.construct()):Mo(`Actual NPC reflection controller required`),getVersion:t=>e.value(()=>(this.actual(t).exact(),78)),read:(t,n)=>this.run(()=>{let r=this.actual(t);return r.exact(),e.readWrapperProperties(t,n,{wrapperSource:`Game:202feec0`,dataSource:`Game:20312d30`,readField:(e,t)=>r.readFieldInternal(e,t,No),readNative:e=>r.readNativeInternal(e,No),readObsoleteProperty:(e,t,n,i)=>r.readObsoletePropertyInternal(e,t,n,i)})})},Po(e.registerFactory(this.factory),`Actual NPC factory registration`)}guard(){if(this.nestedAttempt)throw Error(`Host attempted reentrant NPC mutation`);let e=this.controller.receipt().required;if(e!==null)throw Error(e)}run(e){if(this.active)return this.nestedAttempt=!0,this.controller.value(()=>{throw Error(`Reentrant NPC reading mutation unsupported`)});this.active=!0,this.nestedAttempt=!1;try{return this.controller.value(()=>{this.guard();let t=e();return this.guard(),t})}finally{this.active=!1}}note(e,t){this.guard(),this.controller.write(e,t),this.guard()}call(e,t,n){this.guard();let r=this.controller.effect(e,t,n);return this.guard(),r}actual(e){let t=this.retained.get(e);if(!t)throw Error(`Actual retained NPC allocation required`);return t}properties(e,t=!0){let n=this.retained.get(e);if(!n)return Mo(`Actual retained NPC allocation required`);try{return n.exact(t),jo(n)}catch(e){return Mo(String(e))}}construct(){let e=this.controller.allocateWrapper(this.factory,`Game:203125f0`),t=new Vo(e,this);return this.retained.set(e,t),t.construct(),t.base.isValid()||t.base.createBase(),this.note(`NPC.Create IsValid AL==1 gate; inherited Create/literal1`,`Game:202f8e80`),this.controller.setAllocationPhase(e,`created`),this.controller.attachConstructedNative(e,t.base,`Game:202fb970`,`Game:2030eb30`),this.controller.initializeProperties(e,e=>t.assignDefaultInternal(e,No),()=>(t.exact(),this.note(`NPC PostInitialize inherited literal1`,`SharedBase:100076f8`),jo(void 0)),`Game:2030f1e0`),e}},V=e=>({known:!0,value:e}),H=e=>({known:!1,reason:e}),Uo=new Map([[`€`,128],[`‚`,130],[`ƒ`,131],[`„`,132],[`…`,133],[`†`,134],[`‡`,135],[`ˆ`,136],[`‰`,137],[`Š`,138],[`‹`,139],[`Œ`,140],[`Ž`,142],[`‘`,145],[`’`,146],[`“`,147],[`”`,148],[`•`,149],[`–`,150],[`—`,151],[`˜`,152],[`™`,153],[`š`,154],[`›`,155],[`œ`,156],[`ž`,158],[`Ÿ`,159]]);function Wo(e){let t=new Uint8Array(e.length);for(let n=0;n<e.length;n++){let r=e[n],i=e.codePointAt(n);if(i>65535)throw Error(`Original bCString code-page profile does not accept supplementary Unicode characters`);let a=Uo.get(r)??i;if(a>255)throw Error(`Original bCString code-page profile does not contain U+`+i.toString(16));t[n]=a}return t}function Go(e){let t=e.pointer;if(e.destroyed||e.slot.freed)throw Error(`Live original Unicode string required`);if(t===null)return``;if(t.freed||t.bytes.length<14||t.knownMask.subarray(0,12).some(e=>e!==255))throw Error(`Known original Unicode header and character allocation required`);let n=new DataView(t.bytes.buffer,t.bytes.byteOffset,t.bytes.byteLength),r=n.getInt32(4,!0);if(!Number.isInteger(r)||r<0||12+(r+1)*2>t.bytes.length||t.knownMask.subarray(12,12+(r+1)*2).some(e=>e!==255))throw Error(`Known original Unicode text extent required`);let i=``;for(let e=0;e<r;e++)i+=String.fromCharCode(n.getUint16(12+e*2,!0));return i}var Ko=class{allocationIndex=0;allocations=new Set;cstrings=new WeakMap;liveCstrings=new Set;liveNpcCstrings=new Set;localization=new Map;localizationAdmin=Object.freeze({kind:`browser-localization-replacement`});diagnostics=[];controller=null;wrapperBackings=[];allocate(e){if(!Number.isInteger(e)||e<0||e>2147483647)throw RangeError(`Finite browser allocation extent required`);let t={identity:Object.freeze({allocation:++this.allocationIndex}),bytes:new Uint8Array(e),knownMask:new Uint8Array(e),freed:!1};return this.allocations.add(t),t}release(e){return!this.allocations.has(e)||e.freed?H(`Allocation is foreign or its lifetime already ended`):(e.freed=!0,V(void 0))}realloc(e,t){try{if(e!==null&&(!this.allocations.has(e)||e.freed))throw Error(`Actual live MemoryAdmin backing required`);let n=this.allocate(t);if(e!==null){let r=Math.min(e.bytes.length,t);n.bytes.set(e.bytes.subarray(0,r)),n.knownMask.set(e.knownMask.subarray(0,r)),e.freed=!0}return V(n)}catch(e){return H(e instanceof Error?e.message:String(e))}}newCString(e){try{let t=Wo(e),n=this.allocate(t.length+1);n.bytes.set(t),n.bytes[t.length]=0,n.knownMask.fill(255);let r={identity:n.identity,text:e,length:t.length,referenceCount:1,freed:!1,characterBytes:n.bytes,characterKnownMask:n.knownMask};return this.cstrings.set(r.identity,n),this.liveCstrings.add(r),V(r)}catch(e){return H(e instanceof Error?e.message:String(e))}}endCString(e){let t=this.cstrings.get(e.identity);return!t||e.freed||t.freed?H(`Owned CString character allocation is absent or already freed`):(t.freed=!0,this.liveCstrings.delete(e),e.freed=!0,V(void 0))}releaseCString(e){if(e.freed||!Number.isInteger(e.referenceCount)||e.referenceCount<0)throw Error(`Live original CString reference required`);if(e.referenceCount=e.referenceCount-1&65535,e.referenceCount===0){let t=this.endCString(e);if(!t.known)throw Error(t.reason)}}setCString(e,t){let n=this.newCString(t);if(!n.known)return n;let r=e.pointer;return e.pointer=n.value,r!==null&&this.releaseCString(r),V(void 0)}assignCString(e,t){let n=t.pointer;if(n!==null){if(!this.cstrings.has(n.identity)||n.freed||n.referenceCount>=65535)return H(`Same live browser-owned CString source required`);n.referenceCount=n.referenceCount+1&65535}let r=e.pointer;return n&&!(`characterBytes`in n)?H(`Original CString source lacks character allocation bytes`):(e.pointer=n,r!==null&&this.releaseCString(r),V(void 0))}readCString(e,t){try{let n=t.u16(),r=t.strings[n];if(typeof r!=`string`)throw Error(`Indexed source CString is absent`);return this.setCString(e,r)}catch(e){return H(e instanceof Error?e.message:String(e))}}appendLog(e,t,n,r){return this.diagnostics.push({kind:e,source:t,format:n,args:r.slice()}),V(void 0)}attributeHost(){return{allocateWrapper:e=>this.allocateWrapperResult(e),allocateNative:e=>this.allocateResult(e),assignCStringText:(e,t)=>this.setCString(e,t),assignCString:(e,t)=>this.assignCString(e,t),readCString:(e,t)=>this.readCString(e,t),freeCString:e=>this.endCString(e),warning:(e,t)=>this.appendLog(`warning`,t,e,[]),deletingNative:()=>V(void 0),freeNative:e=>this.release(e)}}playerMemoryHost(){return{allocateWrapper:e=>this.allocateWrapperResult(e),allocateNative:e=>this.allocateResult(e),allocateNode:e=>this.allocateResult(e),realloc:(e,t)=>this.realloc(e,t),free:e=>this.release(e),deleteNode:e=>this.release(e),enumDefault:()=>V({value:0,knownMask:0}),coCreateGuid:e=>this.createGuid(e),readCString:(e,t)=>this.readCString(e,t),constructCString:(e,t)=>this.setCString(e,t),assignCString:(e,t)=>this.assignCString(e,t),concatenateCString:(e,t,n)=>this.setCString(e,t+n.text),freeCString:e=>this.endCString(e),allocateUnicode:e=>this.allocateResult(e),localizationAdmin:()=>V(this.localizationAdmin),reserveString:(e,t,n)=>{if(e!==this.localizationAdmin)return H(`Same browser-localized string table required`);try{return this.localization.set(t.text,{text:Go(n.text),description:Go(n.description)}),V(!0)}catch(e){return H(e instanceof Error?e.message:String(e))}},warning:(e,t,n)=>this.appendLog(`warning`,n,e,t),info:(e,t,n,r)=>this.appendLog(`info`,r,t,[...n,e])}}npcReadingHost(){return{enumDefault:()=>V({value:0,knownMask:0}),coCreateGuid:e=>this.createGuid(e),readCString:(e,t)=>{try{let n=t.u16(),r=t.strings[n];if(typeof r!=`string`||e.pointer!==null)throw Error(`Fresh indexed Hero NPC CString read required`);let i={identity:Object.freeze({allocation:++this.allocationIndex}),text:r,length:r.length,referenceCount:1,freed:!1};return this.liveNpcCstrings.add(i),e.pointer=i,V(void 0)}catch(e){return H(e instanceof Error?e.message:String(e))}},freeCString:e=>!this.liveNpcCstrings.has(e)||e.freed?H(`Live browser Hero NPC CString allocation required`):(e.freed=!0,this.liveNpcCstrings.delete(e),V(void 0))}}bindReflectionController(e){if(this.controller!==null)throw Error(`Browser memory runtime is already bound to a reflection controller`);this.controller=e}reflectionHost(){return{timestamps:{profile:`selected-host-monotonic-u32-milliseconds`,readMilliseconds:()=>Math.trunc(performance.now())>>>0},precision:53,isInPanicState:()=>V(!1),deletingDestructor:e=>e.controller===this.controller?V(void 0):H(`Same retained reflection controller required`),deleteObject:e=>{if(e.controller!==this.controller||e.deleted)return H(`Live wrapper from this controller required`);let t=Number(/:wrapper:(\d+)$/.exec(e.identity)?.[1]),n=Number.isSafeInteger(t)&&t>0?this.wrapperBackings[t-1]:void 0;return!n||n.freed?H(`Original wrapper allocation lifetime was not retained`):this.release(n)}}}allocateResult(e){try{return V(this.allocate(e))}catch(e){return H(e instanceof Error?e.message:String(e))}}allocateWrapperResult(e){let t=this.allocateResult(e);return t.known&&this.wrapperBackings.push(t.value),t}createGuid(e){try{if(e.bytes.length!==20||e.knownMask.length!==20||e.destroyed)throw Error(`Fresh original GUID scratch required`);let t=crypto.getRandomValues(new Uint8Array(16)),n=[3,2,1,0,5,4,7,6,8,9,10,11,12,13,14,15];for(let r=0;r<16;r++)e.bytes[r]=t[n[r]],e.knownMask[r]=255;return V(0)}catch(e){return H(e instanceof Error?e.message:String(e))}}summary(){let e=0;for(let t of this.allocations)t.freed||e++;return Object.freeze({allocations:this.allocations.size,liveAllocations:e,liveCStringAllocations:this.liveCstrings.size+this.liveNpcCstrings.size,liveWrapperAllocations:this.wrapperBackings.filter(e=>!e.freed).length,localizationEntries:this.localization.size,logs:Object.freeze(this.diagnostics.slice())})}};async function qo(){let e=await Xa(),t=Za(e,`PC_Hero`,13);if(t.outerVersion!==5||t.source.className!==`gCPlayerMemory_PS`||t.source.serializedSha256!==`a87767e871bf6a1b83e91c58c13350db5b353bbedc0d440bc02b618b2b508135`)throw Error(`Captured Hero PlayerMemory packet differs from the reviewed source record`);let n=new Ko,r=new qa(`browser-hero-player-memory`,n.reflectionHost());n.bindReflectionController(r);let i=new Ao(r,new _o(r,n.attributeHost()),n.playerMemoryHost()),a=r.readAccessor(t.input);if(!a.known){let e=r.receipt().trace.slice(-12).map(e=>e.operation+` @ `+e.source).join(` → `);throw Error(`Original Hero PlayerMemory read stopped: `+a.reason+(e?` | last native steps: `+e:``))}let o=a.value;if(o.instance===null||o.instance.factory!==i.factory)throw Error(`Original Hero PlayerMemory accessor did not retain gCPlayerMemory_PS`);let s=i.playerMemory(o.instance);if(!s.known)throw Error(`Original Hero PlayerMemory storage is unavailable: `+s.reason);let c=s.value.properties.values.PlayerKnows;if(!(c instanceof Oo)||c.kind!==`CString`||!c.items.every(e=>typeof e==`string`))throw Error(`Original Hero PlayerKnows bCString array is not available.`);if(t.input.u32()!==3735929054)throw Error(`Original Hero PlayerMemory outer sentinel differs`);if(t.input.cursor()!==t.input.end)throw Error(`Original Hero PlayerMemory packet has unconsumed bytes: `+t.input.cursor()+`/`+t.input.end);let l=Za(e,`PC_Hero`,6);if(l.outerVersion!==78||l.source.className!==`gCNPC_PS`||l.source.nativeReadVersion!==78||l.source.serializedRaw.length/2!=651)throw Error(`Captured Hero gCNPC_PS packet differs from the reviewed version-78 record`);let u=new Ho(r,n.npcReadingHost()),d=r.readAccessor(l.input);if(!d.known){let e=r.receipt().trace.slice(-12).map(e=>e.operation+` @ `+e.source+(e.cursor===void 0?``:`[`+e.cursor+`]`)+(e.value===void 0?``:`=`+String(e.value))).join(` → `);throw Error(`Original Hero gCNPC_PS read stopped: `+d.reason+(e?` | last native steps: `+e:``))}let f=d.value,p=f.instance;if(!p||p.factory!==u.factory)throw Error(`Original Hero gCNPC_PS accessor did not retain the native NPC factory.`);let m=u.properties(p);if(!m.known)throw Error(`Original Hero gCNPC_PS storage is unavailable: `+m.reason);if(l.input.u32()!==3735929054||l.input.cursor()!==l.input.end)throw Error(`Original Hero gCNPC_PS packet sentinel/cursor differs: `+l.input.cursor()+`/`+l.input.end);if(m.value.values.Level!==0)throw Error(`Serialized Hero NPC Level differs from the captured new-game seed`);let h=r.receipt();return Object.freeze({memory:s.value,accessor:o,npc:m.value,npcAccessor:f,npcWrapper:p,controller:r,source:Object.freeze({sha256:t.source.serializedSha256,bytes:t.source.serializedRaw.length/2,propertySetIndex:13}),npcSource:Object.freeze({sha256:l.source.serializedSha256,bytes:l.source.serializedRaw.length/2,propertySetIndex:6}),cursor:Object.freeze({consumed:t.input.cursor(),total:t.input.end}),gameEvents:Object.freeze(c.items),summary:n.summary(),unresolved:Object.freeze(h.required?[h.required]:[])})}var Jo=[{id:`Hamlar`,name:`Hamlar`,role:`Ardea village elder`,summary:`His original dialogue warns about the consequences of the uprising, discusses Xardas, and asks for help from the rebels at Reddock. This view inspects the source character; it does not run his dialogue or grant rewards.`,questIds:[`Hamlar_gotoReddock`,`Xardas_FindXardas`],source:`Infos.pak/G3_World_01/FILLER65, FILLER67, FILLER864, FILLER936, FILLER939 (.info)`},{id:`Gorn`,name:`Gorn`,role:`Companion; guide to Reddock`,summary:`His Ardea records discuss finding the surviving rebels and guiding the hero to their hideout. The original follow quest names FP_Reddock as its destination; walking that route with Gorn is not implemented.`,questIds:[`Gorn_ShowReddock`],source:`Infos.pak/G3_World_01/BPANKRATZ31442, BPANKRATZ31444–31447, FILLER929 (.info)`},{id:`Diego`,name:`Diego`,role:`Companion at Ardea`,summary:`His original Ardea dialogue explains the orc victory, recommends finding Xardas, discusses replacing the stolen equipment, and describes his own plans to travel south. His later regional quests are outside this scene.`,questIds:[`Xardas_FindXardas`],source:`Infos.pak/G3_World_01/BPANKRATZ31453–31458, FILLER925–927 (.info)`},{id:`Milten`,name:`Milten`,role:`Fire Mage companion`,summary:`His Ardea dialogue describes the loss of rune magic and his search for ancient magic. These Ardea records do not define a separate Milten quest; the monastery quests belong to a later region.`,questIds:[],source:`Infos.pak/G3_World_01/BPANKRATZ31448–31450, SKALVERAM31004, SKALVERAM3927 (.info)`},{id:`Lester`,name:`Lester`,role:`Companion by the coast`,summary:`His original opening dialogue reports that pirates stole the ship, discusses the missing equipment, and describes travelling south. His later Al Shedim quests are outside the Ardea inspection milestone.`,questIds:[],source:`Infos.p00/G3_World_01/BPANKRATZ31451–31452, FILLER928 (.info; effective patch layer)`},{id:`Jack`,name:`Jack`,role:`Old sailor at the tower`,summary:`His original Ardea dialogue describes three coastal bandits and gold entrusted to him by the rebels. The original rewards are documented below; inspection does not kill the bandits, transfer gold, enable trade, or finish a quest.`,questIds:[`Jack_KillBandits`,`Ardea_Pocket`],source:`Infos.pak/G3_World_01/BPANKRATZ31459–31466 (.info)`}],Yo=[{id:`Ardea_Revolution`,title:`Liberate Ardea from the orcs!`,summary:`Original FreeEnclave quest targeting Ardea. Its source records ExperiencePoints=100 and +2 reputation with the Rebels. The native XP callback determines the actual gain. The liberation battle and enclave-state trigger have not been rebuilt.`,source:`Quests.pak/G3_World_01/Ardea_Revolution_quest_G3_World_01.quest`,implemented:!1,unsupportedCommands:[`native:gCQuest_PS::OnEnclaveStateChanged`,`native:gCQuest_PS::SetStatus`]},{id:`Hamlar_gotoReddock`,title:`Talk to the leader of the rebels in Reddock!`,summary:`Original Report quest targeting Javier, with ExperiencePoints=200 and +1 Rebel reputation in its quest record. Hamlar’s separate follow-up dialogue passes 100 to GiveXP and enables trade. Reporting, dialogue conditions and rewards are not executed.`,source:`Quests.pak/G3_World_01/Hamlar_gotoReddock_quest_G3_World_01.quest; Infos.pak/G3_World_01/FILLER936, FILLER939 (.info)`,implemented:!1,unsupportedCommands:[`Say`,`SetTradeEnabled`,`GiveXP`,`native:gCQuest_PS::CheckDeliveryEntitiesStatus`]},{id:`Gorn_ShowReddock`,title:`Gorn shows you the rebels' hideout.`,summary:`Original FollowNPC quest names Gorn and destination FP_Reddock. Its record passes ExperiencePoints=50 to the XP callback and adds +1 Rebel reputation; the related arrival dialogue changes Gorn’s routine. Escorting, arrival detection and routine changes are not implemented.`,source:`Quests.pak/G3_World_01/Gorn_ShowReddock_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31446, BPANKRATZ31447 (.info)`,implemented:!1,unsupportedCommands:[`Say`,`End`,`SetRoutine`,`native:gCQuest_PS::CheckDeliveryEntitiesStatus`]},{id:`Jack_KillBandits`,title:`Jack and the bilge rats.`,summary:`Original Kill quest names Ardea_OutNovice_01, _02 and _03, one each, and ExperiencePoints=100. Jack’s separate reward dialogue records 50 gold and a GiveXP input of 50. Native combat, kill counters and reward dialogue are not executed.`,source:`Quests.pak/G3_World_01/Jack_KillBandits_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31461–31463 (.info)`,implemented:!1,unsupportedCommands:[`Say`,`SetGameEvent`,`Give`,`GiveXP`,`native:gCQuest_PS::OnNPCKilled`]},{id:`Ardea_Pocket`,title:`Jack's rebel gold.`,summary:`Original Report quest targets Jack and records ExperiencePoints=150 plus +1 THF. Its related dialogue sets Jack_Pocket and transfers 400 It_Gold to the player. The original reporting conditions, transfer and attribute reward are not implemented.`,source:`Quests.pak/G3_World_01/Ardea_Pocket_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31465, BPANKRATZ31466 (.info)`,implemented:!1,unsupportedCommands:[`Say`,`SetGameEvent`,`Give`,`native:gCQuest_PS::CheckDeliveryEntitiesStatus`]},{id:`Xardas_FindXardas`,title:`Find Xardas!`,summary:`Original main-story EnterArea quest names PC_Hero and Xardas_Tower, with ExperiencePoints=250. Ardea conversations connect to this quest. Landscape inspection near the tower is available; original dialogue predicates and the arrival trigger remain unimplemented.`,source:`Quests.pak/G3_World_01/Xardas_FindXardas_quest_G3_World_01.quest; Infos.pak/G3_World_01/BPANKRATZ31455–31456, FILLER65, FILLER67 (.info)`,implemented:!1,unsupportedCommands:[`Say`,`SetGameEvent`,`ClearGameEvent`,`native:gCQuest_PS::OnEnter`]}],Xo=[`A TypeScript browser rebuild milestone using local Gothic 3 study data, with source records attached to the inspected people and quests.`,`A third-person Hero follows the browser controller and selects recovered idle, walk and run clips. The 19 native Hero property sets, original movement blending/collision, combat timing, attachments and NPC animation selection are not yet connected to ordinary play.`,`The journal contains 641 original quest definitions and 4,381 dialogue records in five source languages. Catalog presence does not establish gameplay execution.`,`782 original landscape cells stream across Myrtana, Nordmar and Varant, using recovered texture/blend/UV graphs. Native lightmaps, lower mips, global lighting and collision remain incomplete.`,`The retained Hero PlayerMemory seeds the browser game-event list, and the journal uses source quest state. Ordinary dialogue, remaining startup callbacks, combat and progression still need runtime host services.`,`The six character summaries describe the original Ardea dialogue. This milestone does not execute the original dialogue tree, its predicates or its side effects.`,`The six listed quest action sequences remain unimplemented; only the audited Xardas_FindXardas startup transition is live. Inspection grants no XP, reputation, gold, skills or quest completion.`,`Native combat, NPC routines, faction simulation, trading, original save compatibility and the full streamed world still require implementation.`,`Recovered Ghidra C-like code is a behavior reference. It is not buildable original source or an automatically converted TypeScript engine.`],U=new class{quests=[];infos=[];enums={infoConditionType:{},infoType:{},questStatus:{}};language=`English`;manifest=null;pending=null;texts=new Map;commandNames=null;get languages(){return this.manifest?.localization.files.map(e=>e.language)??[]}load(){return this.pending||=this.readCatalog().catch(e=>{throw this.pending=null,e}),this.pending}async readCatalog(){this.manifest=await Mr.manifest();let e=this.manifest.runtime??{quests:this.manifest.urls.runtimeQuests??this.manifest.urls.quests,infos:this.manifest.urls.runtimeInfos??this.manifest.urls.infos},[t,n,r]=await Promise.all([this.read(e.quests),this.read(e.infos),this.read(this.manifest.urls.enums)]);if(!Array.isArray(t)||t.length!==this.manifest.counts.quests||!Array.isArray(n)||n.length!==this.manifest.counts.infos)throw Error(`Gameplay catalog counts differ from the source manifest`);let i=new Set;for(let e of t){if(!e.id||i.has(e.id)||!Array.isArray(e.deliveryTargets))throw Error(`Invalid or duplicate native quest`);i.add(e.id)}let a=new Set;for(let e of n){if(!e.id||a.has(e.id)||!Array.isArray(e.commands))throw Error(`Invalid or duplicate native info`);a.add(e.id)}this.quests=t,this.infos=n,this.enums=r,await this.setLanguage(this.language)}async read(e){return Mr.read(e)}async setLanguage(e){let t=this.manifest?.localization.files.find(t=>t.language===e);if(!t)throw Error(`Original language not present: `+e);this.texts.has(e)||this.texts.set(e,await this.read(t.url)),this.language=e}text(e){let t=this.texts.get(this.language)?.[e];return t?t.text:`[`+e+`]`}entry(e){return this.texts.get(this.language)?.[e]}async nativeCommandNames(){if(await this.load(),this.commandNames)return new Set(this.commandNames);if(!this.manifest)throw Error(`Original gameplay manifest is unavailable.`);let e=(await this.read(this.manifest.urls.commands))?.native;if(e?.module!==`scripts/Script_Game.dll`||e.inputSha256!==`2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1`||e.lookup?.va!==`0x100db360`||e.dispatcher?.va!==`0x100dbb80`||!Array.isArray(e.entries)||e.entries.length!==54)throw Error(`Original Script_Game command table receipt differs.`);let t=new Set,n=new Set;for(let r of e.entries){if(!r||typeof r.name!=`string`||!r.name||!Number.isInteger(r.opcode)||r.opcode<0||r.opcode>53||t.has(r.name.toLowerCase())||n.has(r.opcode))throw Error(`Original Script_Game command table has an invalid or duplicate entry.`);t.add(r.name.toLowerCase()),n.add(r.opcode)}return this.commandNames=t,new Set(t)}forOwner(e){return this.infos.filter(t=>t.owner===e).sort((e,t)=>(e.sortId??0)-(t.sortId??0)||e.id.localeCompare(t.id))}};function W(e,t,n=`p`,r){let i=document.createElement(n);return i.textContent=t,r&&(i.className=r),e.append(i),i}function Zo(e,t){W(e,t.source.archive+` · `+t.source.path+` · SHA-256 `+t.source.sha256,`p`,`source`)}function Qo(e,t,n){let r=document.createElement(`details`),i=document.createElement(`summary`),a=t.commands.find(e=>e.command.toLowerCase()===`description`)??t.commands.find(e=>e.command.toLowerCase()===`say`&&e.entity1===`player`);i.textContent=a?.text&&U.text(a.text)||t.id,r.append(i),W(r,(t.conditionType===null?`Unresolved condition`:U.enums.infoConditionType[String(t.conditionType)]??String(t.conditionType))+(t.quest?` · `+t.quest:``)+(t.parent?` · parent `+t.parent:``),`p`,`record-meta`);let o=n.given(t),s=n.source(t.id);W(r,o.known&&s?`Fresh-world source flags · Given `+o.value+` · stored Permanent `+s.permanent+(s.sourcePermanent===null?` (factory default)`:``)+`. Startup and eligibility are not evaluated here.`:`Fresh-world flags unresolved: `+(o.known?`missing source record`:o.reason),`p`,`record-meta`);for(let e of t.commands){if(!e.command)continue;let n=e.command.toLowerCase();if(n!==`description`){if(n===`say`||n===`showsubtitle`){let i=U.text(e.text);W(r,(n===`say`?(e.entity1===`player`?`Hero`:e.entity1===`npc`?t.owner:e.entity1)+`: `:``)+i,`p`,`dialogue-line`)}else{let t=[e.entity1,e.entity2,e.id1,e.id2,e.text].filter(Boolean);W(r,`Original action · `+e.command+(t.length?` (`+t.join(`, `)+`)`:``),`p`,`record-meta`)}}}Zo(r,t),e.append(r)}async function $o(e,t){let n=document.createElement(`section`);e.append(n),W(n,`Reading original dialogue…`);try{let[,e]=await Promise.all([U.load(),Qr()]);if(!n.isConnected)return;n.replaceChildren();let r=U.forOwner(t);if(!r.length){W(n,`No original dialogue records have this owner name.`);return}W(n,`Original dialogue`,`h3`),W(n,r.length+` source records · `+U.language+`. These records include conditional conversations; their availability and actions are still being rebuilt.`);for(let t of r)Qo(n,t,e)}catch(e){n.isConnected&&(n.replaceChildren(),W(n,`Original dialogue could not load: `+String(e),`p`,`warnings`))}}async function es(e){let t=document.createElement(`section`);e.append(t),W(t,`Reading original quest catalog…`);try{if(await U.load(),!t.isConnected)return;t.replaceChildren(),W(t,U.quests.length+` original quests · `+U.infos.length+` dialogue records. Runtime quest state could not be loaded; these source records are for reference.`);let e=document.createElement(`div`);e.className=`catalog-controls`;let n=document.createElement(`input`);n.type=`search`,n.value=`Ardea`,n.placeholder=`Search original quests`,n.setAttribute(`aria-label`,`Search original quests`);let r=document.createElement(`select`);r.setAttribute(`aria-label`,`Original text language`);for(let e of U.languages)r.add(new Option(e,e,!1,e===U.language));e.append(n,r),t.append(e);let i=W(t,``,`p`,`record-meta`),a=document.createElement(`div`);t.append(a);let o=0,s=()=>{let e=n.value.trim().toLocaleLowerCase(),t=U.quests.filter(t=>[t.id,t.folder,U.text(t.logTopic)].some(t=>t.toLocaleLowerCase().includes(e)));i.textContent=t.length+` matching quests · `+U.language,a.replaceChildren();let r=0,o=document.createElement(`button`);o.textContent=`Show more quests`;let s=()=>{o.remove();let e=Math.min(r+50,t.length);for(;r<e;){let e=t[r++];if(!e)continue;let n=document.createElement(`details`);W(n,U.text(e.logTopic)||e.id,`summary`),W(n,e.id+` · `+e.folder,`p`,`record-meta`),e.logText&&W(n,U.text(e.logText)),e.prereqs.length&&W(n,`Original prerequisites: `+e.prereqs.join(`, `)),e.deliveryTargets.length&&W(n,`Original targets: `+e.deliveryTargets.map(e=>e.entity+` × `+(e.amount??`?`)).join(`, `)),W(n,`Source ExperiencePoints field: `+(e.rewards.experience??`unresolved`)+`. The original XP script derives the actual gain; viewing this record grants no reward.`),Zo(n,e),a.append(n)}r<t.length&&a.append(o)};o.onclick=s,s()};n.oninput=s,r.onchange=async()=>{let e=++o;r.disabled=!0;try{await U.setLanguage(r.value),e===o&&t.isConnected&&s()}catch(e){t.isConnected&&(i.textContent=String(e))}finally{e===o&&(r.disabled=!1)}},s()}catch(e){t.isConnected&&(t.replaceChildren(),W(t,`Original quest catalog could not load: `+String(e),`p`,`warnings`))}}var ts=()=>({kind:`available`}),G=e=>({kind:`unavailable`,reason:e}),K=e=>({kind:`unknown`,reason:e}),ns=(e,t)=>e.id===t.id;function rs(e,t){let n=ns(t.b,t.player)?{...t,a:t.b,b:t.a}:t,r=e.owner===n.b.name;return{...n,self:r?n.b:n.a,other:r?n.a:n.b,npc:ns(n.a,n.player)?n.b:n.a}}function is(e,t,n){switch(e.toLowerCase()){case`player`:return{known:!0,value:t.player};case`npc`:return{known:!0,value:t.npc};case`self`:case`owner`:case`<owner>`:return{known:!0,value:t.self};case`other`:return{known:!0,value:t.other};default:return n.entity(e)}}function as(e,t,n){let r=is(e.entity1,t,n);if(!r.known)return r;let i=is(e.entity2||(r.value&&ns(r.value,t.self)?`other`:`self`),t,n);return i.known?{known:!0,value:{entity1:r.value,entity2:i.value}}:i}function os(e){return e!==Rr.Open&&e!==Rr.Running&&e!==Rr.Lost}function ss(e,t,n){return e.type===0||e.type===4||e.conditionType===9||e.conditionType===51||e.conditionType===52||e.permanent===!0||ns(n,t.player)}function cs(e,t,n,r,i=new Set){if(i.has(e.id))return K(`Cyclic native parent-info availability: `+e.id);if(e.conditionType===null||e.type===null)return K(`Info numeric fields have not been initialized: `+e.id);let a=rs(e,t),o=n.given(e);if(!o.known)return K(o.reason);if(o.value&&e.conditionType!==51)return G(`Info is already Given.`);let s=n.entity(e.owner);if(!s.known)return K(s.reason);if(!s.value)return G(`Native Owner entity does not resolve.`);let c=null;if(e.quest){let t=n.quest(e.quest);if(!t.known)return K(t.reason);if(!t.value)return G(`Native Quest name does not resolve.`);c=t.value}if(e.conditions.ownerNearEntity){let t=n.ownerDistance(e,e.conditions.ownerNearEntity);if(!t.known)return K(t.reason);if(t.value>500)return G(`Native adjusted owner-to-entity distance exceeds 500.`)}switch(e.conditionType){case 2:{let e=n.actor(s.value);if(!e.known)return K(e.reason);if(!e.value.hasDialog||e.value.talkedToPlayer)return G(`Hello requires an untalked-to owner with Dialog property set.`);break}case 5:case 6:if(!c||c.status!==Rr.Open)return G(`Open/Activator requires an Open quest.`);for(let e of c.definition.prereqs){let t=n.quest(e);if(!t.known)return K(t.reason);if(t.value&&!os(t.value.status))return G(`Prerequisite quest is not in a final state: `+e)}if(c.definition.numericType===null||c.definition.numericType===5){let t=n.condition(e,a);if(t.kind!==`available`)return t}break;case 7:case 11:if(!c||c.status!==Rr.Running)return G(`Condition requires a Running quest.`);break;case 10:case 12:case 13:case 20:case 21:case 22:{let t=e.conditionType===10?Rr.Success:e.conditionType===12?Rr.Failed:e.conditionType===13?Rr.Cancelled:e.conditionType===22?Rr.Won:Rr.Lost;if(!c||c.status!==t)return G(`Quest status does not match the original condition.`);break}case 17:{let e=n.dialogFlag(s.value,`TradeEnabled`);if(!e.known)return K(e.reason);if(e.value!==!0)return G(`Trade requires owner Dialog.TradeEnabled.`);break}case 19:if(!c||os(c.status))return G(`Ready requires a quest outside its final state.`);break;case 3:case 24:case 25:case 50:case 51:case 52:break;default:{let t=n.condition(e,a);if(t.kind!==`available`)return t}}let l=n.entity(e.conditions.itemContainer);if(!l.known&&e.conditions.items.length)return K(l.reason);if(l.known&&l.value)for(let t of e.conditions.items){if(t.amount===null)return K(`Conditional item amount is unresolved.`);let e=n.itemStackAmount(l.value,t.id);if(!e.known)return K(e.reason);if(e.value===null||e.value<t.amount)return G(`Conditional item stack is insufficient: `+t.id)}for(let t of e.conditions.playerKnows){let e=n.playerKnows(t);if(!e.known)return K(e.reason);if(!e.value)return G(`Player does not know native game event: `+t)}for(let t of e.conditions.secondaryNPCs){if(t.state===null)return K(`Secondary NPC numeric condition is unresolved.`);let e=n.entity(t.entity);if(!e.known)return K(e.reason);if(!e.value){if(t.state<2||t.state===5)return G(`Required secondary NPC does not resolve.`);break}if(t.state===4||t.state===5){let r=n.actorDialog(e.value);if(!r.known)return K(r.reason);if(!r.value.hasNpc)return G(`Secondary entity has no native NPC property set.`);if(t.state===4&&(!r.value.hasDialog||!r.value.talkedToPlayer))return G(`Secondary NPC has not ended a dialog with the player.`);if(t.state===5&&(!r.value.hasDialog||r.value.talkedToPlayer))return G(`Secondary NPC does not meet the original not-talked state condition.`)}else{let r=n.actor(e.value);if(!r.known)return K(r.reason);if(!r.value.hasNpc)return G(`Secondary entity has no native NPC property set.`);let i=r.value;if(t.state===0&&i.dead||t.state===1&&(i.dead||i.wounded)||t.state===2&&!i.wounded||t.state===3&&!i.dead)return G(`Secondary NPC does not meet the original state condition.`)}}if(e.conditions.playerSkills.length||e.conditions.namedPlayerSkills.length)return K(`Conditional skill serialization requires an independently mapped native consumer.`);if(e.type===4){let a=new Set(i).add(e.id),o;for(let i of r){if(i.parent!==e.id||i.conditionType===52)continue;let s=cs(i,t,n,r,a);if(s.kind===`available`)return s;s.kind===`unknown`&&(o=s.reason)}return o?K(o):G(`Parent has no available child other than Back.`)}return ts()}function ls(e,t,n,r,i,a){if(e.issues.length)return K(`Original INI parser anomalies need native-consumer review: `+e.id);let o=cs(e,t,n,r);if(o.kind!==`available`)return o;let s=rs(e,t),c=i.startGuards(e,s);if(c.kind!==`available`)return c;let l=n.entity(e.owner);if(!l.known)return K(l.reason);if(!l.value)return G(`Native Owner entity does not resolve.`);let u=new Set([...a].map(e=>e.toLowerCase())),d=[];for(let t of e.commands){if(t.command.toLowerCase()===`description`)continue;let r=t.index,a;switch(t.command.toLowerCase()){case`say`:case`give`:case`settradeenabled`:{let o=as(t,s,n);if(!o.known)return K(o.reason);let{entity1:c,entity2:l}=o.value;if(t.command.toLowerCase()===`say`)a={kind:`say`,mode:e.type===5?`comment`:`info`,speaker:c,listener:l,textKey:t.text,sourceIndex:r};else if(t.command.toLowerCase()===`give`){let e=i.integer(t.id2);if(!e.known)return K(e.reason);a={kind:`give`,donor:c,recipient:l,template:t.id1,quality:0,amount:e.value,sourceIndex:r}}else{let e=i.booleanOperand(t.id1);if(!e.known)return K(e.reason);a={kind:`dialogFlag`,entity:c,field:`TradeEnabled`,value:e.value,sourceIndex:r}}break}case`givexp`:{let e=i.integer(t.id1);if(!e.known)return K(e.reason);a={kind:`experienceScript`,self:null,other:s.player,requestedAmount:e.value,sourceIndex:r};break}case`setgameevent`:case`cleargameevent`:a={kind:`gameEvent`,event:t.id1,set:t.command.toLowerCase()===`setgameevent`,target:s.player,sourceIndex:r};break;case`runquest`:case`closequest`:case`succeedquest`:a={kind:`quest`,operation:t.command.toLowerCase()===`runquest`?`run`:t.command.toLowerCase()===`closequest`?`close`:`succeed`,quest:t.id1,sourceIndex:r};break;case`end`:a={kind:`end`,sourceIndex:r};break;case`back`:a={kind:`back`,sourceIndex:r};break;default:if(!t.command)return K(`Native empty-command handling depends on entity/routine warning state.`);if(u.has(t.command.toLowerCase()))return K(`Original native command is not ported: `+t.command);a={kind:`unknownNativeCommand`,command:t.command,sourceIndex:r}}let o=i.capability(a,d);if(!o.known)return K(o.reason);d.push(a)}let f={info:e,roles:s,operations:d,markGivenOnStart:!ss(e,s,l.value),deliveryCallback:e.conditionType===8||e.conditionType===9?{native:`Game.dll::0x20035175`,whenNextNativeIndex:1}:null,endCallback:{native:`Game.dll::0x20007d1f`,conditionType:e.conditionType,quest:e.quest}},p=i.lifecycleCapability(f);return p.known?{kind:`ready`,plan:f}:K(p.reason)}async function us(e,t){for(let n of e.operations){let e=t.capability(n);if(!e.known)return e}let n=t.lifecycleCapability(e);if(!n.known)return n;let r=t.currentAvailability(e);if(r.kind!==`available`)return{known:!1,reason:r.reason};let i=t.startGuards(e.info,e.roles);if(i.kind!==`available`)return{known:!1,reason:i.reason};let a=await t.start(e);if(!a.known)return a;if(!a.value)return{known:!1,reason:`Native InfoScript start was not accepted.`};e.markGivenOnStart&&t.markGiven(e.info);for(let n of e.operations){let r=await t.execute(n);if(r.kind===`unknown`)return{known:!1,reason:r.reason};let i=n.sourceIndex+1;for(;e.info.commands[i]?.command.toLowerCase()===`description`;)i++;if(e.deliveryCallback&&i===1){let n=await t.delivery(e);if(!n.known)return n}}return t.finish(e)}var ds=Object.freeze({id:`PC_Hero`,name:`PC_Hero`}),fs=()=>({kind:`available`}),ps=e=>({kind:`unknown`,reason:e}),ms=new Pr,hs=class{owner;people;playerPosition;runtime;locations;origin;locationFailure;constructor(e,t,n,r,i,a,o){this.owner=e,this.people=t,this.playerPosition=n,this.runtime=r,this.locations=i,this.origin=a,this.locationFailure=o}entity(e){if(e===``)return{known:!0,value:null};if(e===ds.name)return{known:!0,value:ds};let t=this.people.filter(t=>t.name===e);if(t.length>1)return{known:!1,reason:`Native entity name is ambiguous in the active Ardea scene: `+e};let n=t[0];if(n)return{known:!0,value:{id:n.id,name:n.name}};let r=this.locations.get(e);return r?.length===1&&r[0].guid?{known:!0,value:{id:r[0].guid,name:e}}:r&&r.length>1?{known:!1,reason:`Native helper entity name is ambiguous in the source file: `+e}:r?{known:!0,value:null}:this.locationFailure?{known:!1,reason:this.locationFailure}:{known:!1,reason:`Native entity is not resolved in the active Ardea scene or selected SysDyn source: `+e}}given(e){return this.runtime.infoState.given(e)}quest(e){let t=this.runtime.definitions.find(t=>t.id===e);if(!t)return{known:!0,value:null};let n=this.runtime.quests.state(e);return n?{known:!0,value:{definition:t,status:n.status}}:{known:!1,reason:`Native quest state is not seeded: `+e}}ownerDistance(e,t){if(e.owner!==this.owner.name)return{known:!1,reason:`Owner distance requested outside the active NPC.`};let n,r=!1;if(t===ds.name)n=this.playerPosition,r=!0;else{let e=this.people.filter(e=>e.name===t);if(e.length>1)return{known:!1,reason:`Distance target is ambiguous in Ardea: `+t};if(e.length===1)n=e[0].position,r=!0;else{let e=this.locations.get(t);if(!e)return{known:!1,reason:this.locationFailure??`Native distance target is not resolved in the selected SysDyn source: `+t};if(e.length===0)return{known:!0,value:99999};if(e.length!==1)return{known:!1,reason:`Native distance target is ambiguous in the selected SysDyn source: `+t};let i=e[0].position;if(!i||i.length!==3||!i.every(Number.isFinite))return{known:!1,reason:`Native source position is unresolved for `+t};n=[(i[0]-this.origin[0])/100,(i[1]-this.origin[1])/100,-(i[2]-this.origin[2])/100],r=e[0].propertySets.includes(`gCNPC_PS`)}}if(n.length!==3||this.owner.position.length!==3||!n.every(Number.isFinite)||!this.owner.position.every(Number.isFinite))return{known:!1,reason:`Native distance position is malformed.`};let i=this.owner.position;return{known:!0,value:Math.hypot(i[0]-n[0],i[1]-n[1],i[2]-n[2])*(r?25:100)}}playerKnows(e){try{return{known:!0,value:this.runtime.gameEvents.isSet(e)}}catch(e){return{known:!1,reason:e instanceof Error?e.message:String(e)}}}itemStackAmount(e,t){return{known:!1,reason:`Live player inventory stacks are not connected to dialogue predicates.`}}actor(e){return{known:!1,reason:`Native NPC death and wound state are not connected.`}}actorDialog(e){return this.runtime.actorDialogs.dialog(e)}dialogFlag(e,t){return{known:!1,reason:`Live NPC Dialog.`+t+` state is not connected.`}}condition(e){return ps(`Native condition `+e.conditionType+` still needs its runtime facts.`)}currentPlayerPosition(){return this.playerPosition}},gs=class{runtime;catalog;facts;infos;signal;output;constructor(e,t,n,r,i,a){this.runtime=e,this.catalog=t,this.facts=n,this.infos=r,this.signal=i,this.output=a}integer(e){if(!/^[+-]?\d+$/.test(e.trim()))return{known:!1,reason:`Native integer operand is unresolved: `+e};let t=Number(e);return Number.isInteger(t)&&t>=-2147483648&&t<=2147483647?{known:!0,value:t}:{known:!1,reason:`Native integer operand is outside signed32 range.`}}booleanOperand(e){return e.toLowerCase()===`true`?{known:!0,value:!0}:e.toLowerCase()===`false`?{known:!0,value:!1}:{known:!1,reason:`Native boolean operand is unresolved: `+e}}startGuards(e){return e.goldCost===null?ps(`Original Info GoldCost is unresolved.`):e.goldCost===0?e.conditionType===24||e.conditionType===25?ps(`Faction friendship start guards are not connected.`):fs():ps(`Gold-cost dialogue needs the live inventory payment path.`)}capability(e,t=[]){switch(e.kind){case`say`:return e.speaker&&e.listener?{known:!0,value:!0}:{known:!1,reason:`Native Say participant is unresolved.`};case`gameEvent`:return e.target.id===ds.id?{known:!0,value:!0}:{known:!1,reason:`Only the retained Hero PlayerMemory event array is connected.`};case`experienceScript`:return e.other.id===ds.id?this.runtime.canAwardExperienceScripts([...this.priorExperienceAwards(t),e.requestedAmount]):{known:!1,reason:`Only source-backed GiveXP awards to PC_Hero are connected.`};case`quest`:return this.questCapability(e.quest,e.operation,t);case`end`:return{known:!0,value:!0};case`unknownNativeCommand`:return{known:!0,value:!0};default:return{known:!1,reason:`Native dialogue operation is not connected: `+e.kind}}}lifecycleCapability(e){if(e.deliveryCallback)return{known:!1,reason:`Original delivery callbacks are not connected.`};let t=e.info.conditionType,n=t===3||t===19;return!n||t===19&&e.info.quest===``||e.info.quest!==``&&!n?{known:!1,reason:`Only source-backed condition 3/19 completion paths without delivery callbacks are connected.`}:e.info.quest&&!this.runtime.definitions.some(t=>t.id===e.info.quest)?{known:!1,reason:`Native OnEndInfo quest is not in the loaded source: `+e.info.quest}:{known:!0,value:!0}}currentAvailability(e){return cs(e.info,e.roles,this.facts,this.infos)}async start(e){if(this.signal.aborted)return{known:!1,reason:`Dialogue panel closed before native script start.`};let t=this.runtime.beginInfoManager(e.roles.npc);return t.known?{known:!0,value:!0}:t}markGiven(e){this.runtime.infoState.markGiven(e)}async execute(e){if(this.signal.aborted)return{kind:`unknown`,reason:`Dialogue panel closed during native command execution.`};switch(e.kind){case`say`:return await this.say(e);case`gameEvent`:return e.target.id===ds.id?(e.set?this.runtime.gameEvents.set(e.event):this.runtime.gameEvents.clear(e.event),{kind:`completed`}):{kind:`unknown`,reason:`Native game event target is not PC_Hero.`};case`experienceScript`:{if(e.other.id!==ds.id)return{kind:`unknown`,reason:`Native GiveXP target is not PC_Hero.`};let t=this.runtime.awardExperienceScript(e.requestedAmount);if(!t.known)return{kind:`unknown`,reason:t.reason};let n=document.createElement(`p`);if(n.className=`gothic-xp-message`,n.textContent=this.catalog.text(`GO_XP`)+` + `+t.value.awardedAmount,this.output.append(n),t.value.progress.levelUp){let e=document.createElement(`p`);e.className=`gothic-xp-message`,e.textContent=this.catalog.text(`GO_LevelUp`),this.output.append(e)}return this.output.scrollTop=this.output.scrollHeight,{kind:`completed`}}case`quest`:{let t=e.operation===`run`?this.runtime.quests.run(e.quest):e.operation===`close`?this.runtime.quests.close(e.quest):this.runtime.quests.succeed(e.quest);return t.kind===`unsupported`?{kind:`unknown`,reason:t.reason}:t.kind===`rejected`?{kind:`nativeRejected`}:{kind:`completed`}}case`end`:return{kind:`completed`};case`unknownNativeCommand`:{let t=document.createElement(`p`);return t.className=`warnings`,t.textContent=`Original dispatcher warning: command is not in the native command table and was advanced: `+e.command,this.output.append(t),{kind:`completed`}}default:return{kind:`unknown`,reason:`Native dialogue operation is not connected: `+e.kind}}}async delivery(e){return{known:!1,reason:`Original delivery callbacks are not connected.`}}async finish(e){let t=this.lifecycleCapability(e);if(!t.known)return t;if(e.info.quest){let t=e.operations.flatMap(e=>e.kind===`say`?[{version:1,speakerKey:e.speaker?`FO_It_`+e.speaker.name:``,textKey:e.textKey}]:[]),n=this.runtime.quests.appendDialogueLogPairs(e.info.quest,t);if(n.kind!==`applied`)return{known:!1,reason:n.reason}}return{known:!0,value:!0}}questCapability(e,t,n=[]){let r=this.runtime.definitions.find(t=>t.id===e);if(!r)return{known:!1,reason:`Native quest definition is not in the loaded source: `+e};if(r.numericType===5||r.numericType===12)return{known:!1,reason:`Arena quest status notifications are not connected: `+e};if(t===`succeed`){let t=r.rewards;if(t.experience===null||t.political?.amount===null||t.enclave?.amount===null||t.attribute?.amount===null)return{known:!1,reason:`Native quest reward fields are unresolved: `+e};if((t.political?.amount??0)!==0||(t.enclave?.amount??0)!==0||t.attribute?.id&&t.attribute.amount!==0||e.toLowerCase()===`ardea_revolution`)return{known:!1,reason:`Native quest reward services are not connected: `+e};if(t.experience!==0)return this.runtime.canAwardExperienceScripts([...this.priorExperienceAwards(n),t.experience])}return{known:!0,value:!0}}priorExperienceAwards(e){let t=[];for(let n of e)if(n.kind===`experienceScript`)t.push(n.requestedAmount);else if(n.kind===`quest`&&n.operation===`succeed`){let e=this.runtime.definitions.find(e=>e.id===n.quest);e?.rewards.experience!==null&&e?.rewards.experience!==void 0&&e.rewards.experience!==0&&t.push(e.rewards.experience)}return t}say(e){let t=document.createElement(`article`);t.className=`gothic-dialogue-line`;let n=document.createElement(`strong`);n.textContent=e.speaker?.id===ds.id?`Nameless Hero`:e.speaker?.name??`Unknown speaker`;let r=document.createElement(`p`);r.className=`dialogue-line`,r.textContent=this.catalog.text(e.textKey),t.append(n,r),e.mode===`comment`&&(t.dataset.mode=`comment`),this.output.append(t),this.output.scrollTop=this.output.scrollHeight;let i=document.createElement(`button`);return i.textContent=`Continue`,i.className=`dialogue-continue`,this.output.append(i),new Promise(e=>{let t=!1,n=n=>{t||(t=!0,this.signal.removeEventListener(`abort`,r),i.remove(),e(n))},r=()=>n({kind:`unknown`,reason:`Dialogue panel closed before this line was continued.`});i.onclick=()=>n({kind:`completed`}),this.signal.addEventListener(`abort`,r,{once:!0})})}};function _s(e,t,n){let r=e.commands.find(e=>e.command.toLowerCase()===`say`&&e.entity1.toLowerCase()===`player`);if(r){let e=t.text(r.text).trim();if(e)return e}let i=e.commands.find(e=>e.command.toLowerCase()===`description`);if(i){let e=t.text(i.text).trim();if(e)return e}return e.type===2?`Hear `+n.name+`’s news`:`Continue the conversation`}async function vs(e,t,n,r,i,a,o,s,c){let l=document.createElement(`p`);l.textContent=`Original English dialogue. Source predicates and supported game-event changes are live; voice, camera direction, NPC behavior and other native services are still being rebuilt.`,e.append(l);let u=document.createElement(`div`);u.className=`gothic-dialogue-log`,e.append(u);let d=document.createElement(`p`);d.className=`record-meta`,e.append(d);let f=document.createElement(`div`);f.className=`gothic-dialogue-options`,e.append(f);let p=!1;try{await a.load();let l=await a.nativeCommandNames();if(c.aborted||!e.isConnected)return;let m=new Set(n.map(e=>e.name)),h=a.forOwner(t.name).filter(e=>!e.parent&&e.type!==4),g=[...new Set(h.flatMap(e=>[e.conditions.ownerNearEntity,...e.conditions.secondaryNPCs.map(e=>e.entity)]).filter(e=>e!==``&&e!==ds.name&&!m.has(e)))],_=new Map,v=null,y=await ms.sourceByPath(o.path);if(y.kind===`found`&&y.value.source.sha256===o.sha256)try{_=await ms.entitiesNamed(y.value.index,g)}catch(e){v=`Native SysDyn entity index could not be verified: `+(e instanceof Error?e.message:String(e))}else v=y.kind===`found`?`Native SysDyn source hash differs from the Ardea scene manifest.`:y.kind===`ambiguous`?`Selected native SysDyn path is ambiguous in the gameplay source index.`:y.reason;if(c.aborted||!e.isConnected)return;let ee=ds,te={player:ee,a:{id:t.id,name:t.name},b:ee},ne=new hs(t,n,r,i,_,s,v),re=new gs(i,a,ne,a.infos,c,u),b=null,ie=()=>{if(c.aborted||!f.isConnected)return;f.replaceChildren();let e=0,n=[];for(let r of h){let i=ls(r,te,ne,a.infos,re,l);if(i.kind===`ready`){e++;let n=document.createElement(`button`);n.textContent=_s(r,a,t),n.disabled=p,n.onclick=()=>{p||c.aborted||(p=!0,b=null,ie(),us(i.plan,re).then(e=>{p=!1,!c.aborted&&(b=e.known?`Dialogue record complete · `+r.id:`Dialogue stopped at an unsupported native boundary: `+e.reason,ie())}).catch(e=>{p=!1,!c.aborted&&(b=`Dialogue error: `+(e instanceof Error?e.message:String(e)),ie())}))},f.append(n)}else i.kind===`unknown`&&n.push({info:r,reason:i.reason})}if(p?d.textContent=`Running a source dialogue…`:b?d.textContent=b:e===0?d.textContent=`No source dialogue is currently ready for `+t.name+`.`:d.textContent=e+` source response`+(e===1?``:`s`)+` available.`,n.length){let e=document.createElement(`details`),t=document.createElement(`summary`);t.textContent=n.length+` other responses need native state not connected yet`,e.append(t);for(let t of n){let n=document.createElement(`p`);n.textContent=t.info.id+` · `+t.reason,e.append(n)}f.append(e)}};ie()}catch(t){if(c.aborted||!e.isConnected)return;d.textContent=`Original dialogue could not be initialized: `+(t instanceof Error?t.message:String(t)),d.classList.add(`warnings`)}}Object.freeze({playerProtectionScale:.4000000059604645,npcProtectionScale:1.5,npcStrengthMultiplier:-1.5,fistHitPhaseFraction:.6000000238418579,beginPhaseFraction:.5,xpNextMultiplier:250}),Object.freeze({attack:1,powerAttack:2,quickAttack:3,quickAttackR:4,quickAttackL:5,pierceAttack:8,finishingAnimationVariant11:11,finishingAttack:12,quickParadeStumble:17,paradeStumble:18,heavyParadeStumble:21,quickStumble:22,stumble:23,stumbleR:24,stumbleL:25,sitKnockDown:26,getUpAttack:27,getUpParade:28,lieKnockDown:29,lieKnockOut:30,lieDead:33});var ys=-2147483648,bs=2147483647,xs=Object.freeze({stats:[`Script_Game:10046c30`,`Script_Game:10046d30`,`Script_Game:10047a20`,`Script_Game:10047cd0`,`Script_Game:10047530`,`Script_Game:100477c0`],math:[`Script_Game:1003d6a0`,`Script_Game:1007f000`,`Script_Game:1003cbc0`,`Script_Game:1003c980`],rank:[`Script_Game:1003d1d0`,`Script_Game:1003d4d0`,`Script_Game:1003d5a0`],guard:[`Script_Game:100169d0`,`Script_Game:10016c60`,`Script_Game:10016830`,`Script_Game:10016e70`,`Script_Game:100171c0`,`Script_Game:1003d6a0`,`Script_Game:100467f0`,`Script_Game:10046af0`,`Script_Game:10045b20`,`Script_Game:10045e20`],death:[`Script_Game:1003c550`,`Script_Game:1003c6b0`,`Script_Game:1001aca0`,`Script_Game:1001b0c0`],xp:[`Script_Game:10027e70`,`Script_Game:100362f0`,`Script_Game:100628c0`,`Script_Game:100627e0`]});function Ss(e,t){return{status:`resolved`,value:e,evidence:t}}function Cs(e,...t){return{status:`unsupported`,reason:e,dependencies:t}}function ws(e){return Number.isInteger(e)&&e>=ys&&e<=bs}function Ts(e){return ws(e)&&e>=0}function Es(e){return Math.trunc(e)||0}function Ds(e,t){return e+t|0}function Os(e){if(!Ts(e))return Cs(`XP threshold needs an in-range native level.`,`player-level`);let t=Ds(e,2)*.5*500*Ds(e,1);return!Number.isFinite(t)||t<0||t>bs?Cs(`XP threshold needs exceptional conversion handling.`,`xp-threshold-overflow`):Ss(Es(t),[`Script_Game:100627e0`])}function ks(e,t){if(![e.xp,e.level,e.lp,t].every(Ts))return Cs(`XP state is outside bounded nonnegative integer domain.`,`player-progress`);let n=Os(e.level);if(n.status===`unsupported`)return n;let r=Ds(e.xp,t);if(!ws(e.xp+t))return Cs(`XP addition overflows the bounded profile.`,`xp-overflow`);let i=r>=n.value;return i?e.learnPerkActive.status===`unknown`||!e.learnPerkActive.source?Cs(`Perk_Learn activation is unresolved.`,`inventory:Perk_Learn`):!ws(e.level+1)||!ws(e.lp+(e.learnPerkActive.value?11:10))?Cs(`Level/LP addition overflows the bounded profile.`,`progress-overflow`):Ss({xp:r,level:Ds(e.level,1),lp:Ds(e.lp,e.learnPerkActive.value?11:10),levelUp:i},xs.xp):Ss({xp:r,level:e.level,lp:e.lp,levelUp:i},xs.xp)}function As(e,t){if(!Ts(t))return Cs(`Native GiveXP operand is outside the supported nonnegative int32 domain.`,`givexp-operand`);let n=t*5;if(!ws(n))return Cs(`Native GiveXP multiplication exceeds the bounded signed32 profile.`,`xp-overflow`);let r=ks(e,n);return r.status===`unsupported`?r:Ss({requestedAmount:t,awardedAmount:n,progress:r.value},[...xs.xp,`Script_Game:100628c0`])}function js(e,t){let n=e,r=[];for(let e of t){let t=As(n,e);if(t.status===`unsupported`)return t;r.push(t.value),n={...t.value.progress,learnPerkActive:n.learnPerkActive}}return Ss({awards:r,progress:n},[...xs.xp,`Script_Game:100628c0`])}var Ms=JSON.parse(`{
  "schema": "gothic3-player-game-events-rules-v1",
  "nativeExecution": false,
  "scriptModuleSha256": "9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08",
  "evidence": {
    "path": "assets/gothic3/dialogue/native-evidence.json",
    "sha256": "376b5df5539a8743c69c5e4e95eb25956b42508d8b6c095d4c39268146676d08",
    "allRecordedInstructionBytesMatchSourcePE": true
  },
  "methods": {
    "set": { "entryVA": "0x100022a7", "bodyVA": "0x100287e0", "arrayOffset": 24, "appendWhenFindReturns": -1 },
    "clear": { "entryVA": "0x100022de", "bodyVA": "0x10028790", "arrayOffset": 24, "removeFirstMatchingEntry": true }
  }
}
`);if(Ms.schema!==`gothic3-player-game-events-rules-v1`||Ms.nativeExecution!==!1||Ms.scriptModuleSha256!==`9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08`||Ms.evidence.path!==`assets/gothic3/dialogue/native-evidence.json`||Ms.evidence.sha256!==`376b5df5539a8743c69c5e4e95eb25956b42508d8b6c095d4c39268146676d08`||Ms.evidence.allRecordedInstructionBytesMatchSourcePE!==!0||Ms.methods.set.entryVA!==`0x100022a7`||Ms.methods.set.bodyVA!==`0x100287e0`||Ms.methods.set.arrayOffset!==24||Ms.methods.set.appendWhenFindReturns!==-1||Ms.methods.clear.entryVA!==`0x100022de`||Ms.methods.clear.bodyVA!==`0x10028790`||Ms.methods.clear.arrayOffset!==24||Ms.methods.clear.removeFirstMatchingEntry!==!0)throw Error(`Original Script.dll PlayerKnows operation receipt differs.`);var Ns=class{values;constructor(e=[]){if(!Array.isArray(e)||e.some(e=>typeof e!=`string`||e.includes(`\0`)))throw Error(`Original PlayerKnows seed must contain native bCString values.`);this.values=[...e]}isSet(e){return this.requireCString(e),this.values.indexOf(e)!==-1}set(e){return this.requireCString(e),this.values.indexOf(e)===-1&&this.values.push(e),!0}clear(e){this.requireCString(e);let t=this.values.indexOf(e);return t!==-1&&this.values.splice(t,1),!0}snapshot(){return this.values.slice()}requireCString(e){if(typeof e!=`string`||e.includes(`\0`))throw Error(`Native game event needs a valid bCString.`)}};function Ps(e){let t=e.toLowerCase();if(!/^[a-f0-9]{40}$/.test(t))throw Error(`Native Ardea actor needs its 20-byte entity ID`);return t}function Fs(e,t){let n=e.filter(e=>e.name===t);if(n.length!==1||n[0].status!==`decoded`||typeof n[0].value!=`boolean`)throw Error(`Native Ardea actor source has no unique decoded `+t+` value`);return n[0].value}var Is=class{rows=new Map;active=new Set;constructor(e){for(let t of e){if(!t||typeof t.name!=`string`||!t.name||!Array.isArray(t.propertySets))throw Error(`Invalid native Ardea actor source record`);let e=Ps(t.guid),n=t.propertySets.filter(e=>e.name===`gCNPC_PS`),r=t.propertySets.filter(e=>e.name===`gCDialog_PS`);if(n.length>1||r.length>1)throw Error(`Duplicate native Ardea actor property set: `+t.name);let i=r.length===1,a=i?Fs(r[0].properties,`TalkedToPlayer`):!1,o={id:e,name:t.name,hasNpc:n.length===1,hasDialog:i,sourceTalkedToPlayer:a,talkedToPlayer:a};if(this.rows.has(e)||[...this.rows.values()].some(e=>e.name===o.name))throw Error(`Duplicate native Ardea actor identity: `+t.name);this.rows.set(e,o)}}dialog(e){let t=this.rows.get(Ps(e.id));return t?t.name===e.name?{known:!0,value:{hasNpc:t.hasNpc,hasDialog:t.hasDialog,talkedToPlayer:t.talkedToPlayer}}:{known:!1,reason:`Native entity ID/name identity differs for `+e.name+`.`}:{known:!1,reason:`Native NPC/Dialog property state is not loaded for `+e.name+`.`}}beginInfoManager(e){let t=this.dialog(e);return t.known?!t.value.hasNpc||!t.value.hasDialog?{known:!1,reason:`Native dialogue participant lacks its NPC or Dialog property set.`}:(this.active.add(Ps(e.id)),{known:!0,value:!0}):t}endInfoManager(e){let t=Ps(e.id),n=this.rows.get(t);if(!n||n.name!==e.name)throw Error(`Native InfoManager participant does not match Ardea source state`);this.active.delete(t)&&(n.talkedToPlayer=!0)}currentTalkedToPlayerIds(){return[...this.rows.values()].filter(e=>e.talkedToPlayer).map(e=>e.id).sort()}restoreTalkedToPlayerIds(e){let t=new Set;for(let n of e){let e=Ps(n),r=this.rows.get(e);if(!r||!r.hasDialog||t.has(e))throw Error(`Browser save has an invalid or duplicate Ardea dialog actor: `+e);t.add(e)}for(let e of this.rows.values())e.talkedToPlayer=e.sourceTalkedToPlayer||t.has(e.id);this.active.clear()}};function Ls(){let e=JSON.parse(Lr);if(e.schema!==`gothic3-initial-quests-output-v1`||e.questCount!==641||e.output?.path!==`initial-quests.json`||e.output.bytes!==475077||e.output.sha256!==`1ad6940998af6119a833ef27f5e0ea46687610e52bec2640d21ad4635b81e518`)throw Error(`Original initial-quest source receipt differs.`);return e}function Rs(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function zs(e){return Number.isInteger(e)&&e>=0&&e<=4294967295}function Bs(e){return Number.isInteger(e)&&e>=0&&e<=2147483647}function Vs(e){return!(!Rs(e)||!Number.isInteger(e.status)||e.status<0||e.status>7||!Array.isArray(e.counters)||!e.counters.every(e=>Number.isInteger(e)&&e>=0&&e<=2147483647)||!Array.isArray(e.logKeys)||!e.logKeys.every(e=>typeof e==`string`)||e.startedAt!==null&&(!Rs(e.startedAt)||!zs(e.startedAt.years)||!zs(e.startedAt.days)||!zs(e.startedAt.hours))||e.logPairs!==void 0&&(!Array.isArray(e.logPairs)||!e.logPairs.every(e=>Rs(e)&&typeof e.version==`number`&&Number.isInteger(e.version)&&e.version>=0&&e.version<=65535&&typeof e.speakerKey==`string`&&typeof e.textKey==`string`)))}async function Hs(){let e=Ls(),t=await Mr.manifest(),n=t.runtime?.quests??t.urls.runtimeQuests??t.urls.quests,r=t.initial.worldClock,i=t.initial.people;if(typeof r!=`string`||typeof i!=`string`)throw Error(`Original world clock or Ardea actor source path is missing from the gameplay manifest.`);let a=t.outputs.find(e=>e.path===n),o=t.outputs.find(e=>e.path===r),s=t.outputs.find(e=>e.path===i);if(!a||!o||!s||t.counts.quests!==e.questCount)throw Error(`Original quest, clock or Ardea actor source receipts are missing from the gameplay manifest.`);let[c,l,u,d,f]=await Promise.all([Mr.read(n),_r(`dialogue/`+e.output.path,e.output),ia(na(()=>performance.now()),24),Mr.read(i),ii()]);if(!Array.isArray(c)||c.length!==e.questCount||!Array.isArray(d)||l.schema!==`gothic3-initial-quests-v1`||l.scope!==`original-world-state-before-OnGameStartUp`||l.questCount!==e.questCount||l.quests.length!==e.questCount||l.startup.applied!==!1||!l.startup.explicitQuestRuns.includes(`Xardas_FindXardas`)||!l.startup.unimplemented.length)throw Error(`Original quest definitions, fresh-world seed and startup receipt do not agree.`);return{definitions:c,initial:l,clock:u,ardeaActors:new Is(d),heroProgress:f,sources:{initialQuestStates:e.output.sha256,questDefinitions:a.sha256,worldClock:o.sha256,ardeaPeople:s.sha256,initializedPlayer:f.source.sha256}}}function Us(e,t){let n=new Set(e.definitions.map(e=>e.id)),r=Array.isArray(t)?t.map(e=>[e.id,e]):Object.entries(t);if(r.length!==n.size)throw Error(`Quest save does not contain every source state.`);let i=new Set;for(let[t,a]of r){if(!n.has(t)||i.has(t)||!Vs(a))throw Error(`Quest save has an invalid, duplicate or unknown state: `+t);i.add(t),e.quests.seed(t,a)}if(i.size!==n.size)throw Error(`Quest save does not match the source definitions.`)}var Ws=class e{definitions;clock;sources;player;heroProgressSeed;quests;gameEvents;infoState;actorDialogs;listeners=new Set;tickFailure=null;heroAwardHistory=[];constructor(e,t,n,r,i,a,o,s,c=[]){this.definitions=e,this.clock=t,this.sources=n,this.player=o,this.heroProgressSeed=s,this.heroAwardHistory=[...c],this.quests=new zr(e,{clock:()=>t.questClock(),apply:e=>this.applyQuestEffects(e),changed:()=>{for(let e of this.listeners)e()}}),this.gameEvents=new Ns(r),this.infoState=i,this.actorDialogs=a}static async newGame(t){let[n,r]=await Promise.all([Hs(),Qr()]),{definitions:i,initial:a,clock:o,heroProgress:s}=n;if(t.memory.getXP()!==s.xp||t.memory.getLPAttribs()!==s.lpAttribs||t.npc.values.Level!==s.level)throw Error(`Live Hero PlayerMemory does not match the verified new-game progress seed.`);let c=o.snapshot();if(c.calendar.year!==0||c.calendar.day!==0||c.calendar.hour!==12||c.calendar.minute!==0||c.calendar.second!==0||c.adjustment.factor!==12||c.adjustment.secondsPerDay!==86400||c.adjustment.daysPerYear!==365||!c.paused)throw Error(`Original new-world clock seed is not the audited noon/factor-12 state.`);let l={...n.sources,heroPlayerMemory:t.source.sha256,heroNpcProperties:t.npcSource.sha256,infoProvider:r.providerId},u=new e(i,o,l,t.gameEvents,r,n.ardeaActors,t,s);if(Us(u,a.quests),u.quests.run(`Xardas_FindXardas`).kind!==`applied`||u.quests.state(`Xardas_FindXardas`)?.status!==Rr.Running||u.quests.state(`Xardas_FindXardas`)?.startedAt?.hours!==12)throw Error(`The source-audited Xardas_FindXardas startup transition did not apply at noon.`);let d=o.adjust({factor:12,secondsPerDay:86400,daysPerYear:365});if(d.kind!==`applied`)throw Error(`Original session clock setup failed: `+d.reason);let f=o.resume();if(f.kind!==`applied`)throw Error(`Original session clock resume failed: `+f.reason);return u}static async restore(t,n){if(!Rs(t)||t.schema!==`gothic3-quest-session-save-v1`||!Rs(t.sources)||!Rs(t.clock)||!Rs(t.quests))throw Error(`Unsupported Gothic 3 browser save.`);let[r,i]=await Promise.all([Hs(),Qr()]);if(t.sources.initialQuestStates!==r.sources.initialQuestStates||t.sources.questDefinitions!==r.sources.questDefinitions||t.sources.worldClock!==r.sources.worldClock)throw Error(`Browser save belongs to different Gothic 3 source data.`);if(t.sources.heroPlayerMemory!==void 0&&t.sources.heroPlayerMemory!==n.source.sha256)throw Error(`Browser save belongs to different Gothic 3 Hero PlayerMemory data.`);if(t.sources.heroNpcProperties!==void 0&&t.sources.heroNpcProperties!==n.npcSource.sha256)throw Error(`Browser save belongs to different Gothic 3 Hero NPC property data.`);if(t.sources.ardeaPeople!==void 0&&t.sources.ardeaPeople!==r.sources.ardeaPeople)throw Error(`Browser save belongs to different Ardea NPC source properties.`);if(t.sources.initializedPlayer!==void 0&&t.sources.initializedPlayer!==r.sources.initializedPlayer)throw Error(`Browser save belongs to different initialized Hero progress data.`);if(t.sources.infoProvider!==void 0&&t.sources.infoProvider!==i.providerId)throw Error(`Browser save belongs to a different Gothic 3 InfoManager source provider.`);if(!zs(t.clock.years)||!zs(t.clock.days)||typeof t.clock.seconds!=`number`||!Number.isFinite(t.clock.seconds)||t.clock.seconds<0||t.clock.seconds>=86400)throw Error(`Browser save has an invalid world clock.`);let a=t.gameEvents===void 0?n.gameEvents:t.gameEvents;if(!Array.isArray(a)||!a.every(e=>typeof e==`string`&&!e.includes(`\0`)))throw Error(`Browser save has invalid PlayerKnows game events.`);if(t.givenInfoIds!==void 0){if(!Array.isArray(t.givenInfoIds))throw Error(`Browser save has invalid InfoManager Given IDs.`);i.restoreGivenIds(t.givenInfoIds)}if(t.talkedToArdeaActors!==void 0&&(!Array.isArray(t.talkedToArdeaActors)||!t.talkedToArdeaActors.every(e=>typeof e==`string`)))throw Error(`Browser save has invalid Ardea NPC dialogue flags.`);let{heroProgress:o}=r;if(n.memory.getXP()!==o.xp||n.memory.getLPAttribs()!==o.lpAttribs||n.npc.values.Level!==o.level)throw Error(`Live Hero PlayerMemory/NPC properties do not match the verified restore seed.`);let s={xp:o.xp,level:o.level,lpAttribs:o.lpAttribs},c=[];if(t.heroProgress!==void 0){if(!Rs(t.heroProgress)||!Bs(t.heroProgress.xp)||!Bs(t.heroProgress.level)||!Bs(t.heroProgress.lpAttribs))throw Error(`Browser save has invalid Hero progress values.`);let e={xp:o.xp,level:o.level,lp:o.lpAttribs,learnPerkActive:o.learnPerkActive};if(t.heroProgress.awards!==void 0){if(!Array.isArray(t.heroProgress.awards)||!t.heroProgress.awards.every(Bs))throw Error(`Browser save has invalid native GiveXP award history.`);let n=js(e,t.heroProgress.awards);if(n.status===`unsupported`)throw Error(`Saved Hero progression cannot be replayed: `+n.reason);let r=n.value.progress;if(r.xp!==t.heroProgress.xp||r.level!==t.heroProgress.level||r.lp!==t.heroProgress.lpAttribs)throw Error(`Saved Hero progress differs from its source-backed GiveXP history.`);s={xp:r.xp,level:r.level,lpAttribs:r.lp},c=[...t.heroProgress.awards]}else{if(t.heroProgress.level!==o.level||t.heroProgress.lpAttribs!==o.lpAttribs)throw Error(`Legacy Hero save contains unsupported level or learning-point changes.`);let n=t.heroProgress.xp-o.xp;if(n<0||n%5!=0)throw Error(`Saved Hero XP cannot be derived from supported native GiveXP awards.`);let r=As(e,n/5);if(r.status===`unsupported`||r.value.progress.levelUp||r.value.progress.xp!==t.heroProgress.xp)throw Error(r.status===`unsupported`?r.reason:`Legacy Hero save crosses an unsupported level-up.`);s={xp:r.value.progress.xp,level:r.value.progress.level,lpAttribs:r.value.progress.lp},n>0&&(c=[n/5])}}let l={...r.sources,heroPlayerMemory:n.source.sha256,heroNpcProperties:n.npcSource.sha256,infoProvider:i.providerId},u=new e(r.definitions,r.clock,l,a,i,r.ardeaActors,n,o,c);t.talkedToArdeaActors!==void 0&&u.actorDialogs.restoreTalkedToPlayerIds(t.talkedToArdeaActors),Us(u,t.quests);let d=u.clock.set({years:t.clock.years,days:t.clock.days,seconds:t.clock.seconds});if(d.kind!==`applied`)throw Error(`Saved world time cannot be restored: `+d.reason);let f=u.clock.adjust({factor:12,secondsPerDay:86400,daysPerYear:365});if(f.kind!==`applied`)throw Error(`Saved world clock setup failed: `+f.reason);let p=u.clock.process();if(p.kind!==`applied`)throw Error(`Saved world clock could not publish its calendar: `+p.reason);let m=u.clock.resume();if(m.kind!==`applied`)throw Error(`Saved world clock could not resume: `+m.reason);if(s.xp!==o.xp){let e=n.memory.setXP(s.xp);if(!e.supported)throw Error(`Saved Hero XP could not be restored through the native PlayerMemory setter: `+e.reason)}if(s.level!==o.level){let e=n.npc.setLevel(s.level);if(!e.known)throw Error(`Saved Hero level could not be restored through the retained Hero NPC property: `+e.reason)}if(s.lpAttribs!==o.lpAttribs){let e=n.memory.setLPAttribs(s.lpAttribs);if(!e.supported)throw Error(`Saved Hero learning points could not be restored through PlayerMemory: `+e.reason)}return u}advance(){if(this.tickFailure)return{applied:!1,reason:this.tickFailure};let e=this.clock.process();return e.kind===`applied`?{applied:!0,value:e.value}:(this.tickFailure=e.reason,{applied:!1,reason:e.reason})}currentClock(){return this.clock.questClock()}currentWorldCalendar(){return this.clock.calendar()}clockError(){return this.tickFailure}beginInfoManager(e){return this.actorDialogs.beginInfoManager(e)}endInfoManager(e){this.actorDialogs.endInfoManager(e)}canAwardExperienceScript(e){return this.canAwardExperienceScripts([e])}canAwardExperienceScripts(e){try{let t=js(this.playerProgress(),e);return t.status===`unsupported`?{known:!1,reason:t.reason}:{known:!0,value:!0}}catch(e){return{known:!1,reason:e instanceof Error?e.message:String(e)}}}awardExperienceScript(e){let t=this.canAwardExperienceScript(e);if(!t.known)return t;let n=As(this.playerProgress(),e);if(n.status===`unsupported`)return{known:!1,reason:n.reason};let r=this.player.memory.setXP(n.value.progress.xp);if(!r.supported)return{known:!1,reason:`Native PlayerMemory XP setter stopped`+(r.partial?` after partial work`:``)+`: `+r.reason};if(n.value.progress.levelUp){let e=this.player.npc.setLevel(n.value.progress.level);if(!e.known)return{known:!1,reason:`GiveXP stopped after XP while writing retained Hero NPC Level: `+e.reason};let t=this.player.memory.setLPAttribs(n.value.progress.lp);if(!t.supported)return{known:!1,reason:`GiveXP stopped after XP/Level while writing Hero LPAttribs: `+t.reason}}this.heroAwardHistory.push(e);for(let e of this.listeners)e();return{known:!0,value:n.value}}saveData(){let e=this.clock.snapshot().timeAndDate,t={};for(let e of this.definitions){let n=this.quests.state(e.id);if(!n)throw Error(`Cannot save missing quest state: `+e.id);t[e.id]=n}return{schema:`gothic3-quest-session-save-v1`,sources:{...this.sources},clock:{years:e.years,days:e.days,seconds:e.seconds},quests:t,gameEvents:this.gameEvents.snapshot(),givenInfoIds:this.infoState.currentGivenIds(),talkedToArdeaActors:this.actorDialogs.currentTalkedToPlayerIds(),heroProgress:{xp:this.player.memory.getXP(),level:this.player.npc.values.Level,lpAttribs:this.player.memory.getLPAttribs(),awards:[...this.heroAwardHistory]}}}playerProgress(){return{xp:this.player.memory.getXP(),level:this.player.npc.values.Level,lp:this.player.memory.getLPAttribs(),learnPerkActive:this.heroProgressSeed.learnPerkActive}}applyQuestEffects(e){if(e.length===0)return{applied:!0};if(e.length!==1||e[0]?.type!==`experienceScript`)return{applied:!1,reason:`Only a single source-backed Hero GiveXP quest reward is connected; other native reward services remain unavailable.`};let t=this.awardExperienceScript(e[0].requestedAmount);return t.known?{applied:!0}:{applied:!1,reason:t.reason}}rows(){return this.definitions.map(e=>{let t=this.quests.state(e.id);if(!t)throw Error(`Seeded quest state disappeared: `+e.id);return{definition:e,state:t}})}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}};function Gs(e){return Rr[e]??`Unknown`}var Ks=`gothic3:ardea:game:v2`,qs=`gothic3:ardea:exploration:v1`,Js=document.querySelector(`#world`),Ys=document.querySelector(`#interface`);Ys.innerHTML=`<header class="masthead"><div class="eyebrow">Gothic 3 · browser port</div><h1 id="world-title">Ardea</h1><p id="world-caption">Recovered scene · native landscape</p></header><nav class="toolbar"><button id="explore-button">Explore</button><button id="view-button">Third person</button><button id="character-button">Character</button><button id="landscape-button">Landscape</button><button id="inspect-button">Models <kbd>Tab</kbd></button><button id="journal-button">Journal <kbd>J</kbd></button><button id="map-button">Map <kbd>M</kbd></button><button id="save-button">Save <kbd>P</kbd></button><button id="help-button">Help</button><a href="../">Tervain ↗</a></nav><div class="crosshair" id="crosshair"></div><div class="prompt hidden" id="prompt"></div><div class="toast hidden" id="toast" role="status"></div><footer class="bottom"><div class="keys" id="keys"><kbd>W A S D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; drag mouse / click for mouse look<br><kbd>E</kbd> inspect person &nbsp; <kbd>F</kbd> fly &nbsp; <kbd>R</kbd> return to arrival &nbsp; <kbd>Esc</kbd> release mouse</div><div class="coordinate"><span id="coordinates">Loading native scene</span><div id="world-clock"></div><div id="terrain-status"></div><div class="scope-tag">Work in progress · native gameplay still being rewritten</div></div></footer><section class="inspector panel hidden" id="inspector"><div class="eyebrow">Original geometry</div><h2>Character inspection</h2><select id="model-select" aria-label="Character model"></select><div class="row"><button id="wire-button">Wireframe</button><button id="spin-button">Rotate</button><button id="frame-button">Frame</button></div><div id="animation-controls" class="hidden"><label for="clip-select">Native motion</label><select id="clip-select" aria-label="Native motion"><option value="">Bind pose</option></select><button id="clip-play" disabled>Play motion</button></div><p>Drag to rotate · wheel to zoom · right-drag to pan.</p><p id="model-info">Native body and head; exported bind pose.</p><div class="source" id="model-source"></div></section><section class="modal panel hidden" id="modal" aria-label="Information"><button class="close" id="modal-close" aria-label="Close panel">×</button><div id="modal-content"></div></section><div class="map hidden" id="map"><span class="map-label">ARDEA · LOCAL POSITIONS</span><canvas id="map-view" width="488" height="488" aria-label="Local positions map"></canvas></div><div class="loading" id="loading"><section class="intro"><div class="eyebrow">Gothic 3 · TypeScript reconstruction</div><h1>Ardea</h1><h2>The shore of Myrtana</h2><p>Walk through the recovered scene. Inspect original character models, Hero motion and the landscapes of Myrtana, Nordmar and Varant.</p><div class="rule"></div><p>Terrain loads as you move. A source-backed fresh quest state starts Xardas’s first quest. Supported Ardea dialogue and game-event changes now run from original records; voice, NPC simulation, combat and most progression are still being rebuilt.</p><div class="progress"><span id="progress"></span></div><div class="load-status" id="load-status">Reading scene manifest…</div><button class="primary" id="start-button" disabled>Enter Ardea</button><small>Independent from Tervain’s original game.<br>Keyboard and mouse · WebGL · local browser saves</small></section></div>`;var q=e=>document.getElementById(e),Xs=new me({canvas:Js,antialias:!0,powerPreference:`high-performance`});Xs.setPixelRatio(Math.min(devicePixelRatio,1.5)),Xs.setSize(innerWidth,innerHeight),Xs.outputColorSpace=b,Xs.toneMapping=4,Xs.toneMappingExposure=3;var Zs=new v;Zs.background=new Ne(9743284),Zs.fog=new c(9743284,350,1e3),Zs.add(new s(15134960,7828060,2.2)),Zs.add(new Se(15788765,.5));var Qs=new e(16772559,2.4);Qs.position.set(-90,140,-60),Zs.add(Qs);var $s=new m(65,innerWidth/innerHeight,.06,2200),ec=new Pn(Xs),tc=new pr,J=new jr(Xs);Zs.add(J.group);var nc=[],rc=[],ic=!1,ac=`Ardea`,oc=new Map,sc=[],Y,cc=!1,lc=!1,uc=null,dc=null,fc=!1,pc=null,mc=new AbortController,hc=!1,gc=!1,_c=0,vc=0,yc=null,bc=null,X=null,xc=null,Sc=!1,Cc=0,wc=0,Tc=!1,Ec=new S,Dc=new S,Oc=!1,kc=performance.now(),Ac=0,jc=null,Z=null,Mc=null,Nc=!1,Pc=new v;Pc.background=new Ne(3161398),Pc.add(new s(15790303,5328964,2.1)),Pc.add(new Se(15788765,.5));var Fc=new e(16771793,2.8);Fc.position.set(-3,5,-4),Pc.add(Fc);var Ic=new e(12966890,.7);Ic.position.set(3,2,3),Pc.add(Ic);var Lc=new Re(6,30,8030320,4279875);Lc.position.y=-.006,Pc.add(Lc);var Rc=new m(38,innerWidth/innerHeight,.01,100),zc=new Xe(Rc,Js);zc.enableDamping=!0,zc.minDistance=.2,zc.maxDistance=20,zc.enabled=!1;var Q=new Kn($s,Js,e=>{e===`interact`&&Gc(),e===`inspect`&&sl(!lc),e===`journal`&&Kc(),e===`save`&&$c(),e===`reset`&&(ac=`Ardea`,Q.reset(),Bc(`Returned to the original scene arrival point.`)),e===`map`&&cl(),e===`fly`&&Bc(Q.fly?`Free flight · Space up · Q down`:`Grounded exploration`)});Q.active=!1,Q.walkSurfaceReady=e=>!ic||J.hasGroundAt(e);function $(e,t,n){let r=document.createElement(`p`);r.textContent=t,n&&(r.className=n),e.appendChild(r)}function Bc(e){q(`toast`).textContent=e,q(`toast`).classList.remove(`hidden`),_c=performance.now()+5e3}function Vc(){document.pointerLockElement===Js&&document.exitPointerLock()}function Hc(){let e=pc;pc=null,e&&Z&&Z.endInfoManager(e)}function Uc(e){Hc(),mc.abort(),mc=new AbortController,Vc(),fc=!0,Q.active=!1;let t=q(`modal-content`);t.replaceChildren();let n=document.createElement(`div`);n.className=`eyebrow`,n.textContent=`Ardea · browser milestone`;let r=document.createElement(`h2`);return r.textContent=e,t.append(n,r),q(`modal`).classList.remove(`hidden`),t}function Wc(){Hc(),mc.abort(),fc=!1,q(`modal`).classList.add(`hidden`),Q.active=cc&&!lc}function Gc(){if(!dc||lc)return;let e=dc,t=Uc(e.name);pc=e;let n=Jo.find(t=>t.id.toLowerCase()===e.id.toLowerCase()||t.name.toLowerCase()===e.name.toLowerCase());if($(t,n?.role??`Person placed in the original Ardea scene.`),$(t,n?.summary??`This character’s model and position are read from the local game’s compiled world data.`),$(t,`Dialogue runs only when its source predicates, commands and completion callback have a connected browser service. Unsupported source records remain locked with their unresolved requirement shown. Original voice, camera direction and NPC routines are not yet connected.`),n?.questIds.length){let e=document.createElement(`h3`);e.textContent=`Original quest references`,t.append(e);for(let e of n.questIds){let n=Yo.find(t=>t.id===e);$(t,n?n.title+` — `+n.summary:e)}}let r=document.createElement(`button`);r.textContent=`Inspect 3D model`,r.onclick=()=>{Wc(),sl(!0,e.id)},t.append(r),$(t,e.source+(e.body?` · `+e.body:``)+(e.head?` · `+e.head:``),`source`);let i=document.createElement(`details`),a=document.createElement(`summary`);a.textContent=`Inspect all original dialogue records`,i.append(a),t.append(i),$o(i,e.name);let o=document.createElement(`section`);o.className=`gothic-live-dialogue`,t.append(o),Z?vs(o,e,Y.people,[Q.position.x,Q.position.y,Q.position.z],Z,U,Y.spawnSource,Y.origin,mc.signal):$(o,Mc?`Dialogue is unavailable because the source-backed game session failed to load: `+Mc:`Enter Ardea to initialize source-backed dialogue state.`)}function Kc(){let e=Uc(`Original quest journal`);if(!Z){$(e,Mc?`The browser could not load the source-backed quest session: `+Mc:`Enter Ardea to load the new-world quest state.`),$(e,`The static source catalog is shown below for reference; it is not gameplay state.`),Mc&&es(e);return}let t=mc.signal,n=document.createElement(`p`);n.textContent=`Fresh-world state from the original quest manager and compiled runtime records. The audited OnGameStartUp RunQuest starts Xardas_FindXardas at the source clock time. Supported Ardea dialogue predicates and game events now use the live journal; other startup callbacks, quest rewards and most native dialogue services remain unimplemented.`,e.append(n);let r=document.createElement(`div`);r.className=`catalog-controls`;let i=document.createElement(`input`);i.type=`search`,i.placeholder=`Search quest id, folder or destination`,i.setAttribute(`aria-label`,`Search active quest journal`);let a=document.createElement(`select`);a.setAttribute(`aria-label`,`Filter quests by status`);for(let[e,t]of[[`running`,`Running`],[`all`,`All statuses`],[`open`,`Open`],[`success`,`Success`],[`failed`,`Failed`],[`obsolete`,`Obsolete`],[`cancelled`,`Cancelled`],[`lost`,`Lost`],[`won`,`Won`]])a.add(new Option(t,e,!1,e===`running`));r.append(i,a),e.append(r);let o=document.createElement(`p`);o.className=`record-meta`,e.append(o);let s=document.createElement(`div`);e.append(s);let c=0,l=document.createElement(`button`);l.textContent=`Show more quests`;let u=()=>{let e=i.value.trim().toLocaleLowerCase(),t=a.value;return Z.rows().filter(({definition:n,state:r})=>t!==`all`&&Gs(r.status).toLowerCase()!==t?!1:!e||[n.id,n.folder,n.destination].some(t=>t.toLocaleLowerCase().includes(e)))},d=()=>{let e=u();o.textContent=e.length+` source quest states · world clock `+qc(Z.currentClock()),s.replaceChildren(),c=0,l.onclick=()=>f(e),f(e)},f=e=>{l.remove();let t=Math.min(c+40,e.length);for(;c<t;){let t=e[c++],n=document.createElement(`details`),r=document.createElement(`summary`);r.textContent=t.definition.id+` · `+Gs(t.state.status),n.append(r),$(n,`Folder: `+t.definition.folder+` · destination: `+(t.definition.destination||`unresolved`)),t.definition.deliveryTargets.length&&$(n,`Source delivery counters: `+t.definition.deliveryTargets.map((e,n)=>e.entity+` `+(t.state.counters[n]??`?`)+` / `+(e.amount??`?`)).join(` · `)),t.state.startedAt&&$(n,`Started at Year `+t.state.startedAt.years+` · Day `+t.state.startedAt.days+` · `+t.state.startedAt.hours+`:00`),t.state.logPairs?.length&&$(n,`Original log localization keys: `+t.state.logPairs.map(e=>e.textKey).join(`, `)),$(n,t.definition.source.archive+` · `+t.definition.source.path+` · SHA-256 `+t.definition.source.sha256,`source`),s.append(n)}c<e.length&&s.append(l)};l.onclick=()=>f(u()),i.oninput=d,a.onchange=d;let p=Z.subscribe(d);t.addEventListener(`abort`,p,{once:!0}),d()}function qc(e){return`Year `+e.years+` · Day `+e.days+` · `+String(e.hours).padStart(2,`0`)+`:00`}function Jc(e){let t=[e.hour,e.minute,e.second].map(e=>String(e).padStart(2,`0`)).join(`:`);return`Year `+e.year+` · Day `+e.day+` · `+t}function Yc(){return jc||=qo().catch(e=>{throw jc=null,e}),jc}function Xc(){let e=Uc(`PC_Hero · Character`),t=mc.signal;$(e,`Reading the original Hero PlayerMemory and Attribute property sets…`),Yc().then(n=>{if(t.aborted)return;e.replaceChildren();let r=document.createElement(`div`);r.className=`eyebrow`,r.textContent=`Original Hero data · verified serialized PC_Hero`;let i=document.createElement(`h2`);i.textContent=`Nameless Hero`,e.append(r,i);let a=n.npc.values.Level;$(e,(typeof a==`number`?`Level `+a:`Level unknown`)+` · Chapter `+n.memory.getChapter()+` · XP `+n.memory.getXP()+` · learning points `+n.memory.getLPAttribs()+` attribute / `+n.memory.getLPPerks()+` perk`);let o=document.createElement(`table`);o.className=`character-table`;let s=document.createElement(`thead`),c=document.createElement(`tr`);for(let e of[`Attribute`,`Value`,`Maximum`,`Modifier`]){let t=document.createElement(`th`);t.textContent=e,c.append(t)}s.append(c);let l=document.createElement(`tbody`);for(let[e,t]of n.memory.attributes){if(!t)continue;let r=document.createElement(`tr`),i=[e,String(n.memory.getValue(e)),String(n.memory.getMaximum(e)),String(n.memory.getModifier(e))];for(let e of i){let t=document.createElement(`td`);t.textContent=e,r.append(t)}l.append(r)}o.append(s,l),e.append(o),$(e,`Loaded `+n.cursor.consumed+` of `+n.cursor.total+` packet bytes from source record `+n.source.sha256.slice(0,16)+`…`),$(e,`The browser retains the source PlayerMemory, all 15 Attribute/Stat objects and the hash-checked serialized Hero NPC property set. The packet’s legacy Level record is preserved as opaque obsolete-property bytes; its current scalar is shown above and updates with supported GiveXP level-ups. That NPC property set is not attached to a live world entity, and the level-up visual effect is absent. One audited startup quest transition is connected to the journal, while other startup callbacks, most progression and combat remain unconnected. Unknown native enum bits remain masked.`),n.summary.logs.length&&$(e,n.summary.logs.length+` source warning/info records were retained by the browser host.`,`source`)}).catch(n=>{if(t.aborted)return;e.replaceChildren();let r=document.createElement(`h2`);r.textContent=`Hero data could not be loaded`,e.append(r),$(e,String(n),`warnings`),$(e,`The reader stops at the first unsupported native operation and does not invent a fallback value.`)})}function Zc(){let e=Uc(`Controls & current scope`);$(e,`WASD / arrows: move. Shift: run. Drag to look, or click the scene for captured mouse look. Escape releases the pointer. E inspects a nearby person.`),$(e,`F toggles free flight; Space moves up and Q moves down. Third person follows the Hero model and recovered idle, walk and run clips. R returns to the arrival point. P saves this browser session locally. Tab switches to character models; drag to rotate, wheel to zoom, right-drag to pan. M opens the local position map.`),$(e,`Character loads PC_Hero’s serialized PlayerMemory, Attribute/Stat data and NPC Level into the browser’s TypeScript runtime. Supported Ardea dialogue can change source-backed game events, Given flags and bounded XP/level progression. The quest journal runs one source-audited startup transition; most startup operations and campaign progression remain unimplemented.`);let t=document.createElement(`label`);t.textContent=`Preview brightness `;let n=document.createElement(`input`);n.type=`range`,n.min=`0.5`,n.max=`5`,n.step=`0.1`,n.value=String(Xs.toneMappingExposure),n.setAttribute(`aria-label`,`Preview brightness`),n.oninput=()=>{Xs.toneMappingExposure=Number(n.value)},t.append(n),e.append(t),$(e,`Terrain uses the recovered texture, blend and UV graphs, including original tangent-space normal maps. Global lighting, specular lookup, lightmaps and lower texture mips remain browser approximations.`);let r=J.status();$(e,`Landscape: `+r.cells+` resident cells from `+r.total+`, `+r.triangles.toLocaleString()+` triangles. Terrain and texture downloads are bounded.`);let i=document.createElement(`h3`);i.textContent=`Current port boundaries`,e.append(i);let a=document.createElement(`ul`);for(let e of Xo){let t=document.createElement(`li`);t.textContent=e,a.append(t)}e.append(a);for(let t of Y?.notes??[])$(e,t);sc.length&&$(e,`Asset load issues: `+sc.join(`; `),`warnings`);for(let t of r.failures)$(e,t,`warnings`);if(r.failures.length){let t=document.createElement(`button`);t.textContent=`Retry landscape downloads`,t.onclick=()=>{J.retry(),Bc(`Retrying landscape downloads.`)},e.append(t)}let o=document.createElement(`a`);o.href=Nn(`source-manifest.json`),o.textContent=`Open asset provenance`,o.target=`_blank`,o.rel=`noopener`,e.append(o)}async function Qc(){let e=Uc(`Explore the landscape`);$(e,`Fly above Myrtana, Nordmar and Varant. These views show the original landscape; buildings, caves, vegetation and NPCs beyond Ardea are still being rebuilt.`),$(e,`WASD moves, Shift flies faster, Space rises and Q descends. Drag to look. R returns to the Ardea arrival.`);let t=document.createElement(`div`);t.className=`landscape-choices`,t.textContent=`Reading original locations…`,e.append(t);try{let e=await Ir();if(!t.isConnected)return;t.replaceChildren();for(let n of e){let e=document.createElement(`button`);e.textContent=n.name+` · `+n.region,e.onclick=()=>{sl(!1),Wc(),ac=n.name;let e=new S(...n.position).sub(J.originMetres);e.y+=90,Q.fly=!0,Q.teleport([e.x,e.y,e.z],0,-.55),J.update(Q.position,performance.now(),!0),Bc(`Landscape preview · `+n.name+`. Geometry loads as you fly.`)},t.append(e)}}catch(e){t.textContent=`Could not read original destinations: `+String(e)}let n=J.status();$(e,`782 original landscape cells · 2,082,155 triangles across the three regions. Nearby cells stream into view; the entire world is not downloaded at once.`),n.failures.length&&$(e,n.failures.length+` landscape issues are listed in Help.`,`warnings`);let r=document.createElement(`button`);r.textContent=`Inspect original character state`,r.onclick=()=>{Di(Uc(`Original character state`))},e.append(r);let i=document.createElement(`button`);i.textContent=`Inspect original world clock`,i.onclick=()=>{aa(Uc(`Original world clock`),mc.signal)},e.append(i)}function $c(){if(cc)try{localStorage.setItem(Ks,JSON.stringify({version:2,...Q.getState(),landscapeName:ac,nativeSession:Z?.saveData()??null})),Bc(Z?`Position, world clock and quest journal saved in this browser. Original Gothic 3 saves are separate.`:`Exploration position saved; quest state was unavailable. Original Gothic 3 saves are separate.`)}catch(e){Bc(`Could not save this browser session: `+String(e))}}function el(){let e;try{e=[localStorage.getItem(Ks),localStorage.getItem(qs)]}catch{return}for(let t of e)if(t)try{let e=JSON.parse(t);if(e.version!==2&&e.version!==1||!Array.isArray(e.position)||e.position.length!==3||!e.position.every(e=>typeof e==`number`&&Number.isFinite(e))||typeof e.yaw!=`number`||!Number.isFinite(e.yaw)||typeof e.pitch!=`number`||!Number.isFinite(e.pitch))continue;let n=e.position,r=J.originMetres,i=[n[0]+r.x,n[1]+r.y,n[2]+r.z],a=J.manifest?.cells.map(e=>e.boundsMetres)??[Y.bounds],o=J.manifest?i:n;if(!a.some(e=>o[0]>=e.min[0]-100&&o[0]<=e.max[0]+100&&o[2]>=e.min[2]-100&&o[2]<=e.max[2]+100&&o[1]>=e.min[1]-100&&o[1]<=e.max[1]+1e3))continue;ac=typeof e.landscapeName==`string`&&e.landscapeName.length<=64?e.landscapeName:null,Q.fly=e.fly===!0,Q.teleport(n,e.yaw,e.pitch),Bc(e.version===2?`Restored your saved game session.`:`Restored your saved exploration position.`);return}catch{}}function tl(){let e=localStorage.getItem(Ks);if(!e)return{kind:`none`};let t=JSON.parse(e);if(t.version===1)return{kind:`none`};if(t.version!==2)throw Error(`Unsupported browser save version.`);return t.nativeSession?{kind:`saved`,value:t.nativeSession}:{kind:`empty`}}async function nl(e){let t=new n;for(let n of[e.body,e.head]){if(!n)continue;let e=Y.models?.[n];e&&t.add(await ec.model(e))}if(!t.children.length)throw Error(`No exported body/head for `+e.name);return t.name=e.name,t.userData.source=e.source,t}function rl(){if(!yc)return;let e=new le().setFromObject(yc,!0),t=e.getSize(new S),n=e.getCenter(new S),r=C.degToRad(Rc.fov),i=2*Math.atan(Math.tan(r/2)*Rc.aspect),a=Math.max(t.y/(2*Math.tan(r/2)),t.x/(2*Math.tan(i/2)))*1.3;zc.target.copy(n),Rc.position.set(n.x+a*.14,n.y+t.y*.08,n.z-a),zc.update()}function il(e){if(!X){$s.position.copy(Q.position),$s.rotation.set(Q.viewPitch,Q.heading,0,`YXZ`);return}let t=Q.position,n=t.y-1.65;X.object.position.set(t.x,n,t.z),X.object.rotation.y=Q.heading,X.object.visible=Sc;let r=Tc?Math.hypot(t.x-Cc,t.z-wc):0;Cc=t.x,wc=t.z,Tc=!0;let i=r>0&&r<1?r/Math.max(e,1/240):0,a=Q.fly||i<.15?`idle`:i<5.9?`walk`:`run`,o=X.asset.clips.find(e=>e.role===a);if(o&&o.name!==xc&&(X.select(o.name),xc=o.name),X.update(e),!Sc){$s.position.copy(t),$s.rotation.set(Q.viewPitch,Q.heading,0,`YXZ`),$s.updateMatrixWorld();return}let s=C.clamp(Q.viewPitch,-.75,.3);Ec.set(Math.sin(Q.heading)*Math.cos(s),Math.sin(s),-Math.cos(Q.heading)*Math.cos(s)),Dc.set(t.x,n+1.28,t.z),$s.position.copy(Dc).addScaledVector(Ec,-4.25),$s.lookAt(Dc),$s.updateMatrixWorld()}function al(){yc?.traverse(e=>{if(e instanceof Fe)for(let t of Array.isArray(e.material)?e.material:[e.material])t.wireframe=gc})}async function ol(e){let t=[...Y.people,...Y.inspectionPeople??[]].find(t=>t.id===e);if(!t)return;let n=++vc;q(`model-info`).textContent=`Loading `+t.name+`…`;try{let e=t.id===`nameless-hero-exhibit`?await tc.actor(`hero`):null,r=e?.object??await nl(t);if(n!==vc){e?.destroy();return}let i=bc;i?.destroy(),bc=e,yc&&(Pc.remove(yc),i||yc.traverse(e=>{if(e instanceof Fe)for(let t of Array.isArray(e.material)?e.material:[e.material])t.dispose()})),r.traverse(t=>{if(t instanceof Fe&&!e){let e=e=>{let t=e.clone();return t.onBeforeCompile=e.onBeforeCompile,t.customProgramCacheKey=e.customProgramCacheKey,t};t.material=Array.isArray(t.material)?t.material.map(e):e(t.material)}});let a=new le().setFromObject(r),o=a.getCenter(new S);r.position.set(-o.x,-a.min.y,-o.z),Pc.add(r),yc=r,uc=t,al(),rl();let s=0,c=0;r.traverse(e=>{e instanceof Fe&&(c++,s+=(e.geometry.index?.count??e.geometry.getAttribute(`position`).count)/3)}),q(`model-info`).textContent=t.name+` · `+Math.round(s).toLocaleString()+` triangles · `+c+` material meshes. `+(e?`All original skin weights and native motion sampling. Clip blending, combat and attachments are still being rebuilt.`:`Original body + head in exported bind pose; native skinning and clips are not included for this model.`),q(`model-source`).textContent=t.source+` · `+(t.body??``)+` · `+(t.head??``),q(`world-caption`).textContent=e?`Original character geometry · native Hero motion`:`Original character geometry · exported bind pose`;let l=q(`clip-select`);l.replaceChildren(new Option(`Bind pose`,``));for(let t of e?.asset.clips??[]){let e=new Option(t.role+(t.phase?` · `+t.phase:``)+` — `+t.name,t.name);e.title=t.source,l.add(e)}q(`animation-controls`).classList.toggle(`hidden`,!e),q(`clip-play`).disabled=!0,q(`clip-play`).textContent=`Play motion`,ll(),rl()}catch(e){if(n!==vc)return;q(`model-info`).textContent=`Could not load this character: `+String(e)}}async function sl(e,t){if(cc&&(Vc(),Wc(),lc=e,zc.enabled=e,ll(),Q.active=!e,q(`inspector`).classList.toggle(`hidden`,!e),q(`crosshair`).classList.toggle(`hidden`,e),q(`prompt`).classList.add(`hidden`),q(`world-caption`).textContent=e?`Original character geometry`:`Recovered scene · native landscape`,q(`keys`).textContent=e?`Drag to rotate · wheel to zoom · right-drag to pan · Tab returns to Ardea`:`WASD move · Shift run · drag / click for mouse look · E inspect · F fly · R reset · Esc release`,e)){let e=t??uc?.id??Y.inspectionPeople?.[0]?.id??Y.people.find(e=>e.body&&e.head)?.id;e&&(q(`model-select`).value=e,await ol(e))}}function cl(){Oc=!Oc,q(`map`).classList.toggle(`hidden`,!Oc)}function ll(){let e=bc?315:235,t=innerWidth<900?{x:0,y:e,w:innerWidth,h:Math.max(200,innerHeight-e)}:{x:380,y:0,w:Math.max(200,innerWidth-380),h:innerHeight};return Rc.aspect=t.w/t.h,Rc.updateProjectionMatrix(),t}function ul(){if(!Y||!Oc)return;let e=q(`map-view`),t=e.getContext(`2d`);if(!t)return;let n=e.width;t.fillStyle=`#15241c`,t.fillRect(0,0,n,n);let r=Y.bounds.min,i=Y.bounds.max,a=(n-60)/Math.max(1,i[0]-r[0],i[2]-r[2]),o=(e,t)=>[30+(e-r[0])*a,30+(t-r[2])*a];t.strokeStyle=`#40503a`,t.lineWidth=1;for(let e=30;e<n;e+=40)t.beginPath(),t.moveTo(e,30),t.lineTo(e,n-20),t.stroke(),t.beginPath(),t.moveTo(30,e),t.lineTo(n-20,e),t.stroke();t.fillStyle=`#d7bd86`;for(let e of Y.people){let n=o(e.position[0],e.position[2]);t.beginPath(),t.arc(n[0],n[1],3,0,Math.PI*2),t.fill()}let s=Q.getState(),c=o(s.position[0],s.position[2]);t.save(),t.translate(c[0],c[1]),t.rotate(-s.yaw),t.fillStyle=`#e9e7d5`,t.beginPath(),t.moveTo(0,-9),t.lineTo(6,7),t.lineTo(0,4),t.lineTo(-6,7),t.closePath(),t.fill(),t.restore()}async function dl(){let e=await fetch(Nn(`scene.json`));if(!e.ok)throw Error(`Scene manifest HTTP `+e.status);if(Y=await e.json(),await Promise.all([tc.loadManifest().catch(e=>{sc.push(`Native animation: `+String(e))}),J.initialize().catch(e=>{sc.push(`Native terrain: `+String(e))})]),Y.units!==`metres`||!Array.isArray(Y.meshes)||!Y.meshes.length)throw Error(`No recovered world geometry in this scene manifest.`);let t=Y.meshes.length+Y.people.length+1,n=0,r=e=>{q(`load-status`).textContent=e+` · `+n+` / `+t,q(`progress`).style.width=n/Math.max(1,t)*100+`%`},i=[...Y.meshes.map(e=>async()=>{try{let t=await ec.model({obj:e.obj,mtl:e.mtl,source:e.source,materials:e.materials});t.position.fromArray(e.position),e.quaternion&&t.quaternion.fromArray(e.quaternion),e.scale&&t.scale.fromArray(e.scale),t.name=e.name,t.userData.kind=e.kind,e.kind===`terrain`&&rc.push(t),Zs.add(t),t.updateMatrixWorld(!0),nc.push(t)}catch(t){sc.push(e.name+`: `+String(t))}n++,r(`Recovering Ardea`)}),...Y.people.map(e=>async()=>{try{let t=await nl(e);t.position.fromArray(e.position),t.rotation.y=e.rotationY??0,Zs.add(t),oc.set(e.id,t)}catch(t){sc.push(e.name+`: `+String(t))}n++,r(`Placing original characters`)}),async()=>{try{if(X=await tc.actor(`hero`),!X)throw Error(`Recovered Hero animation asset is not in the manifest`);X.object.name=`PC_Hero`,X.object.userData.source=`PC_Hero · original native rig and motion tracks`,X.object.visible=!1,Zs.add(X.object);let e=X.asset.clips.find(e=>e.role===`idle`);e&&(X.select(e.name),xc=e.name)}catch(e){sc.push(`Hero actor: `+String(e))}n++,r(`Loading the Hero`)}],a=0;if(await Promise.all(Array.from({length:4},async()=>{for(;a<i.length;){let e=i[a++];e&&await e()}})),!nc.length)throw Error(`None of the native world meshes could load. `+sc.slice(0,3).join(`; `));let o=[...Y.spawn];Y.spawnIsEye||(o[1]+=1.65),Q.setWorld(nc,o,Y.spawnYaw??0),q(`view-button`).disabled=X===null;let s=q(`model-select`);for(let e of[...Y.inspectionPeople??[],...Y.people]){if(!e.body||!e.head)continue;let t=document.createElement(`option`);t.value=e.id,t.textContent=e.name,s.appendChild(t)}q(`load-status`).textContent=nc.length+` scene objects · `+oc.size+` characters ready`+(sc.length?` · `+sc.length+` load warnings`:``),q(`start-button`).disabled=!1}async function fl(){if(cc||Nc)return;Nc=!0;let e=q(`start-button`);e.disabled=!0,q(`load-status`).textContent=`Loading original Hero state, quest journal and world clock…`;let t=!1;try{let e=await Yc(),n=tl();n.kind===`saved`?(Z=await Ws.restore(n.value,e),t=!0):Z=await Ws.newGame(e),Mc=null}catch(e){Z=null,Mc=e instanceof Error?e.message:String(e)}cc=!0,q(`loading`).classList.add(`hidden`),Q.active=!0,el(),Js.focus(),sc.length&&Bc(`Scene loaded with `+sc.length+` asset warnings. See Help for details.`),Bc(Z?t?`Saved quest journal and world clock restored.`:`New-world quest journal loaded · Xardas_FindXardas is running.`:`Exploration started without quest progression: `+Mc),Nc=!1}q(`start-button`).onclick=()=>{fl()},q(`explore-button`).onclick=()=>{sl(!1),Wc()},q(`view-button`).onclick=()=>{if(!X){Bc(`The recovered Hero model did not load. See Help for asset errors.`);return}Sc=!Sc,q(`view-button`).textContent=Sc?`First person`:`Third person`,q(`world-caption`).textContent=Sc?`PC_Hero · recovered native motion preview`:`Recovered scene · native landscape`},q(`character-button`).onclick=Xc,q(`landscape-button`).onclick=()=>{Qc()},q(`inspect-button`).onclick=()=>{sl(!lc)},q(`journal-button`).onclick=Kc,q(`help-button`).onclick=Zc,q(`map-button`).onclick=cl,q(`save-button`).onclick=$c,q(`modal-close`).onclick=Wc,q(`model-select`).onchange=e=>{ol(e.target.value)},q(`frame-button`).onclick=rl,q(`wire-button`).onclick=()=>{gc=!gc,q(`wire-button`).textContent=gc?`Solid view`:`Wireframe`,al()},q(`spin-button`).onclick=()=>{hc=!hc,q(`spin-button`).textContent=hc?`Stop rotation`:`Rotate`},q(`clip-select`).onchange=e=>{if(!bc)return;let t=e.target.value;try{bc.select(t||null),q(`clip-play`).disabled=!t,q(`clip-play`).textContent=t?`Pause motion`:`Play motion`;let e=bc.clip;q(`model-source`).textContent=e?e.source+` · `+e.duration.toFixed(3)+` seconds · `+e.tracks+` source tracks · `+e.keyframes+` keys. Repetition is an inspector control.`:uc?.source??``}catch(e){Bc(String(e))}},q(`clip-play`).onclick=()=>{bc?.clip&&(bc.playing=!bc.playing,q(`clip-play`).textContent=bc.playing?`Pause motion`:`Play motion`)},document.addEventListener(`keydown`,e=>{e.code===`Escape`&&Wc(),!e.defaultPrevented&&lc&&e.code===`Tab`&&!(e.target instanceof HTMLSelectElement)&&(e.preventDefault(),sl(!1))}),window.addEventListener(`resize`,()=>{Xs.setSize(innerWidth,innerHeight),$s.aspect=innerWidth/innerHeight,$s.updateProjectionMatrix(),ll()}),document.addEventListener(`visibilitychange`,()=>{kc=performance.now(),document.hidden&&Vc()});function pl(e){requestAnimationFrame(pl);let t=Math.min((e-kc)/1e3,.05);if(kc=e,!(document.hidden||innerWidth<=0||innerHeight<=0)){if(cc&&Z){let e=Z.advance();e.applied||(q(`world-clock`).textContent=`World clock stopped: `+e.reason)}if(lc){let e=ll();Xs.setViewport(e.x,e.y,e.w,e.h),hc&&yc&&!matchMedia(`(prefers-reduced-motion: reduce)`).matches&&(yc.rotation.y+=t*.22),bc?.update(t),zc.update(),Xs.render(Pc,Rc)}else{if(Xs.setViewport(0,0,innerWidth,innerHeight),J.update(Q.position,e),!ic&&J.hasGroundAt(Q.position)){ic=!0;for(let e of rc)e.visible=!1;Q.setGeometry([...nc.filter(e=>e.userData.kind!==`terrain`),...J.objects])}J.consumeGeometryChange()&&Q.setGeometry([...nc.filter(e=>!ic||e.userData.kind!==`terrain`),...J.objects]),cc&&!fc&&Q.update(t),il(t),Xs.render(Zs,$s)}if(e-Ac>180&&cc){Ac=e;let t=Q.position;q(`coordinates`).textContent=t.x.toFixed(1)+` / `+t.y.toFixed(1)+` / `+t.z.toFixed(1)+` m · `+(Q.fly?`FREE FLIGHT`:Q.groundFallback?`NO GROUND SUPPORT`:Q.grounded?`GROUNDED`:`FALLING`),Z?q(`world-clock`).textContent=Z.clockError()?`World clock stopped: `+Z.clockError():Jc(Z.currentWorldCalendar())+` · source-seeded`:Mc&&(q(`world-clock`).textContent=`Quest session unavailable`);let n=J.status();lc||(q(`world-title`).textContent=ac??n.region??`Gothic 3`),q(`terrain-status`).textContent=n.ready?`${n.region??`Landscape`} · ${n.cells} / ${n.total} cells`+(n.downloading?` · loading ${n.downloading}`:``)+(!Q.fly&&ic&&!n.groundReady?` · waiting for ground`:``):`Local landscape preview`,dc=null;let r=4;if(!lc)for(let e of Y.people){let n=Math.hypot(e.position[0]-t.x,e.position[2]-t.z);n<r&&Math.abs(e.position[1]-(t.y-1.65))<4&&(dc=e,r=n)}q(`prompt`).classList.toggle(`hidden`,!dc||lc||fc),dc&&(q(`prompt`).textContent=`E · talk to `+dc.name),ul()}_c&&e>_c&&(q(`toast`).classList.add(`hidden`),_c=0)}}requestAnimationFrame(pl),dl().catch(e=>{q(`load-status`).textContent=`Could not open the recovered scene: `+String(e),q(`load-status`).classList.add(`warnings`);let t=q(`start-button`);t.disabled=!1,t.textContent=`Reload scene`,t.onclick=()=>location.reload(),console.error(e)});