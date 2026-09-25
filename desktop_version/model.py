"""
MNIST 손글씨 숫자 인식을 위한 CNN 모델 정의 모듈.

학습 스크립트(train.py)와 손글씨 입력 앱(app.py)이 같은 구조를 공유하기 위해
모델 클래스를 이 파일에 따로 정의한다.
"""

import torch.nn as nn
import torch.nn.functional as F


class 숫자인식CNN(nn.Module):
    """28x28 흑백 손글씨 이미지를 입력받아 0~9 중 하나로 분류하는 합성곱 신경망."""

    def __init__(self):
        super().__init__()
        # 첫 번째 합성곱층: 입력 1채널(흑백) -> 32채널, 3x3 커널
        self.합성곱1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        # 두 번째 합성곱층: 32채널 -> 64채널
        self.합성곱2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        # 과적합을 막기 위한 드롭아웃
        self.드롭아웃1 = nn.Dropout(0.25)
        self.드롭아웃2 = nn.Dropout(0.5)
        # 완전연결층: 7x7 크기의 64채널 특징맵을 펼쳐서 128차원으로 축소
        self.전결합1 = nn.Linear(64 * 7 * 7, 128)
        # 최종 출력층: 0~9 열 개의 클래스
        self.전결합2 = nn.Linear(128, 10)

    def forward(self, 입력):
        """순전파. 입력 크기는 (배치, 1, 28, 28)."""
        출력 = F.relu(self.합성곱1(입력))          # (배치, 32, 28, 28)
        출력 = F.max_pool2d(출력, 2)               # (배치, 32, 14, 14)
        출력 = F.relu(self.합성곱2(출력))          # (배치, 64, 14, 14)
        출력 = F.max_pool2d(출력, 2)               # (배치, 64, 7, 7)
        출력 = self.드롭아웃1(출력)
        출력 = 출력.flatten(1)                     # (배치, 3136)
        출력 = F.relu(self.전결합1(출력))
        출력 = self.드롭아웃2(출력)
        출력 = self.전결합2(출력)                  # (배치, 10)
        # 로그 소프트맥스를 반환하므로 손실 함수로는 NLLLoss를 사용한다.
        return F.log_softmax(출력, dim=1)
