/**
 * 마우스·터치·펜으로 숫자를 쓰는 그림판.
 *
 * 데스크톱 버전은 화면용 tkinter Canvas 와 인식용 PIL Image 에 같은 획을 두 번
 * 그렸다. tkinter Canvas 에서는 픽셀을 되읽을 수 없기 때문이다.
 * 웹에서는 getImageData 로 캔버스 픽셀을 그대로 읽을 수 있으므로 캔버스 하나만 쓴다.
 *
 * 포인터 이벤트를 쓰므로 마우스·손가락·펜이 모두 같은 경로로 처리된다.
 */

import { 회색으로 } from "./전처리.js";

/** 캔버스 한 변의 픽셀 수. app.py 의 캔버스크기 와 같아야 한다 (28의 10배). */
export const 캔버스크기 = 280;

/** 붓 굵기. MNIST 글씨 두께와 비슷해지도록 잡은 값. app.py 의 펜굵기 와 같다. */
export const 펜굵기 = 22;

export class 그림판 {
  /**
   * @param {HTMLCanvasElement} 캔버스요소
   * @param {{붓뗐을때?: () => void}} 설정
   *   붓뗐을때 — 획을 끝냈을 때 부를 함수. 데스크톱처럼 자동 인식에 쓴다.
   */
  constructor(캔버스요소, { 붓뗐을때 } = {}) {
    // 화면에 보이는 크기는 CSS 가 정하고, 내부 해상도는 280x280 으로 고정한다.
    // 이렇게 해야 화면 크기와 무관하게 전처리 결과가 같다.
    캔버스요소.width = 캔버스크기;
    캔버스요소.height = 캔버스크기;

    this.캔버스 = 캔버스요소;
    this.맥락 = 캔버스요소.getContext("2d", { willReadFrequently: true });
    this.붓뗐을때 = 붓뗐을때;
    this.이전좌표 = null;
    this.그린적있음 = false;

    this.맥락.lineCap = "round";    // tkinter 의 capstyle=ROUND 와 같은 모양
    this.맥락.lineJoin = "round";
    this.맥락.lineWidth = 펜굵기;
    this.맥락.strokeStyle = "white";
    this.맥락.fillStyle = "white";

    this.지우기();
    this.이벤트연결();
  }

  이벤트연결() {
    const 캔버스 = this.캔버스;
    캔버스.addEventListener("pointerdown", (이벤트) => {
      이벤트.preventDefault();
      // 포인터를 캔버스에 붙들어 두면 캔버스 밖으로 나가도 이벤트가 계속 온다.
      캔버스.setPointerCapture(이벤트.pointerId);
      this.그리기시작(this.좌표변환(이벤트));
    });
    캔버스.addEventListener("pointermove", (이벤트) => {
      if (this.이전좌표 === null) return;
      이벤트.preventDefault();
      this.그리는중(this.좌표변환(이벤트));
    });
    for (const 이름 of ["pointerup", "pointercancel"]) {
      캔버스.addEventListener(이름, (이벤트) => {
        if (this.이전좌표 === null) return;
        이벤트.preventDefault();
        this.그리기끝();
      });
    }
    // 캔버스 위에서 길게 누를 때 뜨는 컨텍스트 메뉴를 막는다 (모바일에서 방해가 된다).
    캔버스.addEventListener("contextmenu", (이벤트) => 이벤트.preventDefault());
  }

  /**
   * 화면 좌표를 캔버스 내부 좌표(0~280)로 바꾼다.
   * CSS 로 캔버스를 줄여 표시하고 있으므로 비율을 곱해야 한다.
   */
  좌표변환(이벤트) {
    const 사각 = this.캔버스.getBoundingClientRect();
    return {
      x: ((이벤트.clientX - 사각.left) / 사각.width) * 캔버스크기,
      y: ((이벤트.clientY - 사각.top) / 사각.height) * 캔버스크기,
    };
  }

  그리기시작(좌표) {
    this.이전좌표 = 좌표;
    this.그린적있음 = true;
    // 점만 찍고 떼는 경우에도 획이 남도록 원을 하나 그린다 (app.py 도 같다).
    this.맥락.beginPath();
    this.맥락.arc(좌표.x, 좌표.y, 펜굵기 / 2, 0, Math.PI * 2);
    this.맥락.fill();
  }

  그리는중(좌표) {
    this.맥락.beginPath();
    this.맥락.moveTo(this.이전좌표.x, this.이전좌표.y);
    this.맥락.lineTo(좌표.x, 좌표.y);
    this.맥락.stroke();
    this.이전좌표 = 좌표;
  }

  그리기끝() {
    this.이전좌표 = null;
    if (this.붓뗐을때) this.붓뗐을때();
  }

  /** 캔버스를 검게 비운다. */
  지우기() {
    this.맥락.fillStyle = "black";
    this.맥락.fillRect(0, 0, 캔버스크기, 캔버스크기);
    this.맥락.fillStyle = "white";
    this.이전좌표 = null;
    this.그린적있음 = false;
  }

  /**
   * 현재 그림을 흑백 픽셀 배열로 돌려준다 (0 = 배경, 255 = 획).
   * @returns {Uint8Array} 길이 280*280
   */
  회색픽셀() {
    const 자료 = this.맥락.getImageData(0, 0, 캔버스크기, 캔버스크기).data;
    return 회색으로(자료);
  }
}
