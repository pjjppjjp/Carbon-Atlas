/** In-page camera compositing. This is manual placement, NOT spatial tracking.
 * Real hit-test floor anchoring remains a separate WebXR / native-AR option.
 * Camera frames stay on the device; no uploads, recordings or analytics.
 */
export class CameraSession {
  constructor(video) { this.video=video; this.stream=null; this.ticket=0; }
  async start() {
    this.stop(); const ticket=++this.ticket;
    if (!isSecureContext) throw new Error('Open the HTTPS GitHub Pages address to use the camera.');
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not expose a camera. The 3D view is ready.');
    let stream;
    try { stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}}); }
    catch(error) {
      if(error.name==='OverconstrainedError') stream=await navigator.mediaDevices.getUserMedia({audio:false,video:true});
      else throw error;
    }
    if(ticket!==this.ticket){stream.getTracks().forEach(t=>t.stop());return false;}
    this.stream=stream;this.video.srcObject=stream;
    try { await this.video.play(); } catch(e) {this.stop();throw e;}
    if(ticket!==this.ticket){stream.getTracks().forEach(t=>t.stop());return false;}
    return true;
  }
  stop() { this.ticket++; this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null; }
  get active(){return !!this.stream?.getVideoTracks().some(t=>t.readyState==='live');}
}
export function cameraError(error) {
  if(['NotAllowedError','PermissionDeniedError'].includes(error?.name)) return 'Camera permission is off. Allow Camera in your browser’s site settings, then tap Open camera again.';
  if(['NotFoundError','DevicesNotFoundError'].includes(error?.name)) return 'No camera was detected on this device. You can still rotate and explore the colored 3D specimen.';
  if(error?.name==='NotReadableError') return 'The camera is busy in another app. Close that app and try again.';
  return error?.message||'The camera could not start. The 3D specimen remains available.';
}
