<!-- BATCH:1 START -->
---
[ref] 78쪽 [유형 01] 문제 5 삼각함수 - 사인법칙과 코사인법칙 유형 01
[문제]
5 (2분)
원 O에 내접하는 사각형 ABCD가 있다. 선분 BC와 선분 CD의 길이가 같고, $\angle \text{BCD} = \frac{\pi}{3}$ 이다. 
원 O의 반지름의 길이를 $R$, 사각형 ABCD의 넓이를 $S$라 할 때, $S = \frac{48\sqrt{3}}{49} R^2$ 이 성립한다. 
$\overline{\text{AB}} + \overline{\text{AD}} = \frac{q\sqrt{3}}{p} R$ 일 때, $p+q$ 의 값은? (단, $p, q$는 서로소인 자연수이다.)

① 11
② 13
③ 15
④ 17
⑤ 19
[해설]
[풀이]
1. 사각형 ABCD는 원 O에 내접하므로 마주 보는 각의 합은 $\pi$이다. $\angle \text{BCD} = \frac{\pi}{3}$이므로 $\angle \text{DAB} = \frac{2\pi}{3}$이다.
2. $\triangle \text{BCD}$에서 $\overline{\text{BC}} = \overline{\text{CD}}$이고 끼인각이 $\frac{\pi}{3}$이므로 이 삼각형은 정삼각형이다.
   이 정삼각형은 원 O에 내접하므로 사인법칙에 의해 $\overline{\text{BD}} = 2R \sin\frac{\pi}{3} = \sqrt{3}R$이다. 따라서 $\overline{\text{BC}} = \overline{\text{CD}} = \overline{\text{BD}} = \sqrt{3}R$이다.
3. 사각형 ABCD의 넓이 $S$는 $\triangle \text{BCD}$와 $\triangle \text{ABD}$의 넓이의 합이다.
   $S = \triangle \text{BCD} + \triangle \text{ABD}$
   $\frac{48\sqrt{3}}{49} R^2 = \frac{1}{2}(\sqrt{3}R)^2 \sin\frac{\pi}{3} + \frac{1}{2} \cdot \overline{\text{AB}} \cdot \overline{\text{AD}} \cdot \sin\frac{2\pi}{3}$
   $\frac{48\sqrt{3}}{49} R^2 = \frac{3\sqrt{3}}{4} R^2 + \frac{\sqrt{3}}{4} \overline{\text{AB}} \cdot \overline{\text{AD}}$
   양변을 $\frac{\sqrt{3}}{4}$으로 나누면, $\frac{192}{49} R^2 = 3R^2 + \overline{\text{AB}} \cdot \overline{\text{AD}}$
   $\overline{\text{AB}} \cdot \overline{\text{AD}} = \left( \frac{192}{49} - 3 \right) R^2 = \frac{45}{49} R^2$
4. $\triangle \text{ABD}$에서 코사인법칙을 적용하면,
   $\overline{\text{BD}}^2 = \overline{\text{AB}}^2 + \overline{\text{AD}}^2 - 2 \cdot \overline{\text{AB}} \cdot \overline{\text{AD}} \cos\frac{2\pi}{3}$
   $(\sqrt{3}R)^2 = \overline{\text{AB}}^2 + \overline{\text{AD}}^2 + \overline{\text{AB}} \cdot \overline{\text{AD}}$
   $3R^2 = \overline{\text{AB}}^2 + \overline{\text{AD}}^2 + \frac{45}{49} R^2$
   $\overline{\text{AB}}^2 + \overline{\text{AD}}^2 = \frac{102}{49} R^2$
5. 곱셈공식의 변형에 의해,
   $(\overline{\text{AB}} + \overline{\text{AD}})^2 = \overline{\text{AB}}^2 + \overline{\text{AD}}^2 + 2\overline{\text{AB}} \cdot \overline{\text{AD}} = \frac{102}{49} R^2 + 2\left(\frac{45}{49} R^2\right) = \frac{192}{49} R^2$
   $\overline{\text{AB}} + \overline{\text{AD}} = \sqrt{\frac{192}{49} R^2} = \frac{8\sqrt{3}}{7} R$
   따라서 $p=7, q=8$이므로 $p+q=15$이다.
[팁]
정삼각형과 외접원의 관계를 파악하면 $\overline{\text{BD}}$를 $R$로 쉽게 나타낼 수 있으며, 내접 사각형의 대각의 합이 $\pi$임을 이용하여 $\angle \text{A}$를 구하는 것이 핵심 접근법입니다. 역문제 형태로 넓이가 주어졌을 때는 넓이 공식을 역산하여 두 변의 곱을 도출하는 전략이 빈출됩니다.
[정답] 3
---
[ref] 78쪽 [유형 01] 문제 6 삼각함수 - 사인법칙과 코사인법칙 유형 01
[문제]
6 (2분)
원 O에 내접하는 삼각형 ABC가 있다. $\angle \text{ABC} = \frac{\pi}{3}$ 이고, $\overline{\text{AB}} + \overline{\text{BC}} = 15$ 이다. 
$\angle \text{ABC}$ 의 이등분선이 원 O와 만나는 점 중 B가 아닌 점을 D라 할 때, 삼각형 ABC의 넓이와 삼각형 ADC의 넓이의 비는 $26 : 49$ 이다.
점 B를 포함하지 않는 호 AC의 길이는 $\frac{q}{p}\pi$ 이다. $p+q$ 의 값은? (단, $p, q$는 서로소인 자연수이다.)

① 13
② 15
③ 17
④ 19
⑤ 21
[해설]
[풀이]
1. 사각형 ABCD는 원 O에 내접하므로 $\angle \text{ADC} = \pi - \angle \text{ABC} = \frac{2\pi}{3}$이다.
2. $\overline{\text{BD}}$가 $\angle \text{ABC}$의 이등분선이므로 $\angle \text{ABD} = \angle \text{CBD} = \frac{\pi}{6}$이다. 원주각의 크기가 같으므로 그에 대한 현의 길이도 같아져 $\overline{\text{AD}} = \overline{\text{CD}}$이다.
3. 원 O의 반지름을 $R$이라 하자. $\triangle \text{ABC}$에서 사인법칙에 의해 $\overline{\text{AC}} = 2R \sin\frac{\pi}{3} = \sqrt{3}R$이다.
   $\triangle \text{ADC}$는 $\overline{\text{AD}} = \overline{\text{CD}}$인 이등변삼각형이며, 꼭지각이 $\frac{2\pi}{3}$이므로 밑각은 $\frac{\pi}{6}$이다.
   사인법칙에 의해 $\overline{\text{AD}} = 2R \sin\frac{\pi}{6} = R$이다.
4. 두 삼각형의 넓이를 $R$과 $\overline{\text{AB}}, \overline{\text{BC}}$로 표현하면,
   $\triangle \text{ADC} = \frac{1}{2} \cdot R \cdot R \cdot \sin\frac{2\pi}{3} = \frac{\sqrt{3}}{4} R^2$
   $\triangle \text{ABC} = \frac{1}{2} \cdot \overline{\text{AB}} \cdot \overline{\text{BC}} \cdot \sin\frac{\pi}{3} = \frac{\sqrt{3}}{4} \overline{\text{AB}} \cdot \overline{\text{BC}}$
   넓이의 비가 26 : 49 이므로, $\frac{\sqrt{3}}{4} \overline{\text{AB}} \cdot \overline{\text{BC}} : \frac{\sqrt{3}}{4} R^2 = 26 : 49$
   즉, $\overline{\text{AB}} \cdot \overline{\text{BC}} = \frac{26}{49} R^2$ 이다.
5. $\triangle \text{ABC}$에서 코사인법칙을 적용하면,
   $\overline{\text{AC}}^2 = \overline{\text{AB}}^2 + \overline{\text{BC}}^2 - 2\overline{\text{AB}} \cdot \overline{\text{BC}} \cos\frac{\pi}{3}$
   $(\sqrt{3}R)^2 = (\overline{\text{AB}} + \overline{\text{BC}})^2 - 3\overline{\text{AB}} \cdot \overline{\text{BC}}$
   $3R^2 = 15^2 - 3\left(\frac{26}{49} R^2\right)$
   양변을 3으로 나누면 $R^2 = 75 - \frac{26}{49} R^2$
   $\frac{75}{49} R^2 = 75 \implies R^2 = 49 \implies R=7$
6. 점 B를 포함하지 않는 호 AC에 대한 중심각은 원주각 $\angle \text{ABC} = \frac{\pi}{3}$의 두 배인 $\frac{2\pi}{3}$이다.
   호의 길이는 $l = R\theta = 7 \times \frac{2\pi}{3} = \frac{14}{3}\pi$이다.
   따라서 $p=3, q=14$이므로 $p+q=17$이다.
[팁]
원주각의 이등분선이 외접원과 만나는 점을 이용해 이등변삼각형을 만들어내는 작도는 자주 출제되는 기하학적 무대입니다. 주어진 합 $\overline{\text{AB}} + \overline{\text{BC}}$와 곱 $\overline{\text{AB}} \cdot \overline{\text{BC}}$를 코사인법칙 $\overline{\text{AC}}^2 = (\overline{\text{AB}}+\overline{\text{BC}})^2 - 3\overline{\text{AB}} \cdot \overline{\text{BC}}$ 에 연립하는 대수적 식 조작이 핵심 풀이입니다.
[정답] 3
---
<!-- BATCH:1 END -->
<!-- BATCH:2 START -->
---
[ref] 79쪽 [유형 02] 문제 11
[문제]
11 (2분)
반지름의 길이가 $R$인 원 $O$에 내접하는 사각형 $\mathrm{ABCD}$가 있다. 선분 $\mathrm{AB}$의 길이는 3이고, 점 $\mathrm{A}$를 포함하지 않는 호 $\mathrm{BCD}$의 길이는 원 $O$의 둘레의 길이의 $\frac{2}{3}$이다. 원 $O$의 넓이가 $\frac{13}{3}\pi$이고, 두 선분 $\mathrm{BC}$와 $\mathrm{CD}$의 길이에 대하여 $\mathrm{BC}-\mathrm{CD}=1$이 성립할 때, 선분 $\mathrm{AC}$의 길이의 제곱인 $\overline{\mathrm{AC}}^2$의 값은? (단, $\overline{\mathrm{BC}}>\overline{\mathrm{CD}}$)
① 10
② 11
③ 12
④ 13
⑤ 14
[해설]
[풀이]
점 $\mathrm{A}$를 포함하지 않는 호 $\mathrm{BCD}$의 길이가 원 둘레의 $\frac{2}{3}$이므로, 이 호에 대한 중심각은 $360^{\circ} \times \frac{2}{3} = 240^{\circ}$이다.
이 반사각에 대한 원주각은 사각형 내부의 $\angle \mathrm{BAD}$이므로, $\angle \mathrm{BAD} = \frac{1}{2} \times 240^{\circ} = 120^{\circ}$이다.
원에 내접하는 사각형의 마주 보는 각의 합은 $180^{\circ}$이므로 $\angle \mathrm{BCD} = 180^{\circ} - 120^{\circ} = 60^{\circ}$이다.

원 $O$의 넓이가 $\frac{13}{3}\pi$이므로 $R^2 = \frac{13}{3}$이다.
$\triangle \mathrm{ABD}$에서 사인법칙을 적용하면 $\frac{\overline{\mathrm{BD}}}{\sin 120^{\circ}} = 2R$이므로,
$\overline{\mathrm{BD}}^2 = 4R^2 \sin^2 120^{\circ} = 4 \times \frac{13}{3} \times \left(\frac{\sqrt{3}}{2}\right)^2 = 13$이다.

$\triangle \mathrm{BCD}$에서 코사인법칙을 적용하면
$\overline{\mathrm{BD}}^2 = \overline{\mathrm{BC}}^2 + \overline{\mathrm{CD}}^2 - 2 \cdot \overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}} \cdot \cos 60^{\circ}$
조건 $\overline{\mathrm{BC}} - \overline{\mathrm{CD}} = 1$에서 $\overline{\mathrm{BC}} = \overline{\mathrm{CD}} + 1$을 대입하면,
$13 = (\overline{\mathrm{CD}}+1)^2 + \overline{\mathrm{CD}}^2 - (\overline{\mathrm{CD}}+1)\overline{\mathrm{CD}} = \overline{\mathrm{CD}}^2 + \overline{\mathrm{CD}} + 1$
$\overline{\mathrm{CD}}^2 + \overline{\mathrm{CD}} - 12 = 0 \implies (\overline{\mathrm{CD}}+4)(\overline{\mathrm{CD}}-3) = 0$
길이는 양수이므로 $\overline{\mathrm{CD}} = 3$이고, $\overline{\mathrm{BC}} = 4$이다.
마찬가지로 $\triangle \mathrm{ABD}$에서 코사인법칙을 적용하면
$13 = 3^2 + \overline{\mathrm{AD}}^2 - 2 \cdot 3 \cdot \overline{\mathrm{AD}} \cdot \cos 120^{\circ} \implies \overline{\mathrm{AD}}^2 + 3\overline{\mathrm{AD}} - 4 = 0$
$\overline{\mathrm{AD}} = 1$이다.

이제 $\overline{\mathrm{AC}}$를 구하기 위해 $\triangle \mathrm{ABC}$와 $\triangle \mathrm{ADC}$에서 코사인법칙을 연립한다.
$\triangle \mathrm{ABC}$에서: $\overline{\mathrm{AC}}^2 = 3^2 + 4^2 - 2 \cdot 3 \cdot 4 \cos \mathrm{B} = 25 - 24 \cos \mathrm{B}$
$\triangle \mathrm{ADC}$에서: $\overline{\mathrm{AC}}^2 = 1^2 + 3^2 - 2 \cdot 1 \cdot 3 \cos \mathrm{D} = 10 - 6 \cos \mathrm{D}$
$\angle \mathrm{B} + \angle \mathrm{D} = 180^{\circ}$이므로 $\cos \mathrm{D} = -\cos \mathrm{B}$이다.
$25 - 24 \cos \mathrm{B} = 10 + 6 \cos \mathrm{B} \implies 30 \cos \mathrm{B} = 15 \implies \cos \mathrm{B} = \frac{1}{2}$
따라서 $\overline{\mathrm{AC}}^2 = 25 - 24 \left(\frac{1}{2}\right) = 13$이다.
[팁]
원에 내접하는 사각형에서 마주 보는 각의 성질($\angle \mathrm{B} + \angle \mathrm{D} = 180^{\circ} \implies \cos \mathrm{D} = -\cos \mathrm{B}$)을 이용해 두 삼각형의 코사인법칙을 연립하면 남은 대각선의 길이를 쉽게 구할 수 있다.
[정답] 4
---
[ref] 79쪽 [유형 02] 문제 12
[문제]
12 (2분)
원 $O$에 내접하는 삼각형 $\mathrm{ABC}$가 있다. 선분 $\mathrm{AB}$의 길이는 6이고, 선분 $\mathrm{BC}$의 길이는 $3\sqrt{10}$이다. 원 $O$의 중심에 대하여 $\angle \mathrm{OBC} = 45^{\circ}$일 때, 가능한 모든 선분 $\mathrm{AC}$의 길이의 합은?
① $10\sqrt{2}$
② $11\sqrt{2}$
③ $12\sqrt{2}$
④ $13\sqrt{2}$
⑤ $14\sqrt{2}$
[해설]
[풀이]
삼각형 $\mathrm{OBC}$는 $\overline{\mathrm{OB}} = \overline{\mathrm{OC}}$인 이등변삼각형이므로 $\angle \mathrm{OCB} = 45^{\circ}$이고, 중심각 $\angle \mathrm{BOC} = 180^{\circ} - (45^{\circ} + 45^{\circ}) = 90^{\circ}$이다.
호 $\mathrm{BC}$에 대한 원주각 $\angle \mathrm{A}$의 크기는 예각삼각형인 경우 $\frac{1}{2} \times 90^{\circ} = 45^{\circ}$이고, 둔각삼각형인 경우 $\frac{1}{2} \times (360^{\circ} - 90^{\circ}) = 135^{\circ}$이다. 

$\overline{\mathrm{AC}}$의 길이를 $x$라 하고 $\triangle \mathrm{ABC}$에서 코사인법칙을 적용한다.
(i) $\angle \mathrm{A} = 45^{\circ}$인 경우
$\overline{\mathrm{BC}}^2 = \overline{\mathrm{AB}}^2 + \overline{\mathrm{AC}}^2 - 2 \cdot \overline{\mathrm{AB}} \cdot \overline{\mathrm{AC}} \cdot \cos 45^{\circ}$
$(3\sqrt{10})^2 = 6^2 + x^2 - 2 \cdot 6 \cdot x \cdot \frac{\sqrt{2}}{2}$
$90 = 36 + x^2 - 6\sqrt{2}x \implies x^2 - 6\sqrt{2}x - 54 = 0$
근의 공식에 의해 $x = 3\sqrt{2} \pm \sqrt{18 + 54} = 3\sqrt{2} \pm 6\sqrt{2}$이다.
길이는 양수이므로 $x = 9\sqrt{2}$이다.

(ii) $\angle \mathrm{A} = 135^{\circ}$인 경우
$(3\sqrt{10})^2 = 6^2 + x^2 - 2 \cdot 6 \cdot x \cdot \cos 135^{\circ}$
$90 = 36 + x^2 - 2 \cdot 6 \cdot x \cdot \left(-\frac{\sqrt{2}}{2}\right)$
$90 = 36 + x^2 + 6\sqrt{2}x \implies x^2 + 6\sqrt{2}x - 54 = 0$
근의 공식에 의해 $x = -3\sqrt{2} \pm \sqrt{18 + 54} = -3\sqrt{2} \pm 6\sqrt{2}$이다.
길이는 양수이므로 $x = 3\sqrt{2}$이다.

따라서 가능한 모든 선분 $\mathrm{AC}$의 길이의 합은 $9\sqrt{2} + 3\sqrt{2} = 12\sqrt{2}$이다.
[팁]
특정 각이 주어지지 않고 원주각에 대응하는 중심각 정보만 있을 때, 삼각형이 예각삼각형인지 둔각삼각형인지 명시되지 않았다면 두 가지 분기를 모두 고려해야 한다. 코사인법칙에서 도출되는 이차방정식을 풀 때는 근과 계수의 관계를 기계적으로 사용하지 말고, 도형의 변의 길이가 항상 양수라는 제약 조건을 통해 유효한 근만 필터링해야 오류를 피할 수 있다.
[정답] 3
---
<!-- BATCH:2 END -->
<!-- BATCH:3 START -->
---
[ref] 80쪽 [유형 03] 문제 16 삼각함수 - 사인법칙과 코사인법칙 유형 03
[문제]
16 (2분)
평면 위에 세 꼭짓점 $A, B, C$로 이루어진 삼각형 $ABC$가 있다. 선분 $BC$의 길이를 $a$, 선분 $CA$의 길이를 $b$, 선분 $AB$의 길이를 $c$라 하자. 삼각형 $ABC$의 세 내각 $A, B, C$의 사인값에 대하여 $\sin A : \sin B : \sin C = 3 : 5 : \lambda$가 성립하고 ($\lambda$는 양의 실수), 세 내각 중 가장 크기가 큰 내각의 크기는 $120^{\circ}$이다. $\lambda$가 유리수이고 삼각형 $ABC$의 둘레의 길이가 $30$일 때, 삼각형 $ABC$의 외접원의 반지름의 길이를 $R$, 내접원의 반지름의 길이를 $r$이라 하자. $R \cdot r$의 값은?

① 10
② 12
③ 14
④ 16
⑤ 18
[해설]
[풀이]
1. 변의 길이비 설정
삼각형 $ABC$에서 사인법칙에 의해 세 변의 길이의 비는 세 내각의 사인값의 비와 같다.
즉, $a : b : c = \sin A : \sin B : \sin C = 3 : 5 : \lambda$ 이다.
비례상수 $m$ ($m>0$)에 대하여 세 변의 길이를 다음과 같이 나타낼 수 있다.
$a = 3m$, $b = 5m$, $c = \lambda m$

2. 가장 큰 각에 코사인법칙 적용 및 케이스 분류
가장 큰 내각의 크기가 $120^{\circ}$이므로, 가장 긴 변의 대각이 $120^{\circ}$이다.
$a = 3m < b = 5m$ 이므로 $a$는 가장 긴 변이 될 수 없다. 따라서 가장 긴 변은 $b = 5m$ 이거나 $c = \lambda m$ 이다.

케이스 1: 가장 긴 변이 $b = 5m$ 인 경우 ($\lambda < 5$)
대각 $B = 120^{\circ}$이므로 코사인법칙에 의해
$b^2 = a^2 + c^2 - 2ac \cos B$
$(5m)^2 = (3m)^2 + (\lambda m)^2 - 2(3m)(\lambda m) \cos 120^{\circ}$
양변을 $m^2$ ($m>0$)으로 나누고 정리하면
$25 = 9 + \lambda^2 + 3\lambda$
$\lambda^2 + 3\lambda - 16 = 0$
$\lambda > 0$ 이므로 근의 공식에 의해 $\lambda = \frac{-3 + \sqrt{73}}{2}$ 이다.
이 값은 무리수이므로 $\lambda$가 유리수라는 조건에 모순된다.

케이스 2: 가장 긴 변이 $c = \lambda m$ 인 경우 ($\lambda > 5$)
대각 $C = 120^{\circ}$이므로 코사인법칙에 의해
$c^2 = a^2 + b^2 - 2ab \cos C$
$(\lambda m)^2 = (3m)^2 + (5m)^2 - 2(3m)(5m) \cos 120^{\circ}$
양변을 $m^2$ ($m>0$)으로 나누고 정리하면
$\lambda^2 = 9 + 25 + 15 = 49$
$\lambda > 0$ 이므로 $\lambda = 7$ 이다.
이 값은 유리수이므로 조건을 만족한다. (또한 $\lambda = 7 > 5$ 이므로 $c$가 가장 긴 변이라는 가정도 만족한다.)

3. 삼각형의 세 변의 실제 길이 결정
$\lambda = 7$ 이므로 세 변의 길이의 비는 $a : b : c = 3 : 5 : 7$ 이다.
삼각형 $ABC$의 둘레의 길이가 $30$이므로
$a + b + c = 3m + 5m + 7m = 15m = 30 \implies m = 2$
따라서 실제 세 변의 길이는 $a = 6$, $b = 10$, $c = 14$ 이다.

4. 외접원 및 내접원의 반지름 계산
외접원의 반지름 $R$의 길이는 사인법칙에 의해
$\frac{c}{\sin C} = 2R \implies \frac{14}{\sin 120^{\circ}} = 2R$
$2R = \frac{14}{\frac{\sqrt{3}}{2}} = \frac{28}{\sqrt{3}} \implies R = \frac{14}{\sqrt{3}}$

삼각형 $ABC$의 넓이를 $S$라 하면
$S = \frac{1}{2} a b \sin C = \frac{1}{2} \cdot 6 \cdot 10 \cdot \sin 120^{\circ} = 15\sqrt{3}$
또한, 내접원의 반지름 $r$과 둘레의 길이를 이용한 삼각형의 넓이 공식에 의해
$S = \frac{1}{2} r (a + b + c) = \frac{1}{2} r \cdot 30 = 15r$
따라서 $15r = 15\sqrt{3} \implies r = \sqrt{3}$ 이다.

5. $R \cdot r$의 값 계산
$R \cdot r = \frac{14}{\sqrt{3}} \cdot \sqrt{3} = 14$ 이다.
[정답] 3
---
[ref] 80쪽 [유형 03] 문제 17 삼각함수 - 사인법칙과 코사인법칙 유형 03
[문제]
17 (2분)
평면 위에 세 꼭짓점 $A, B, C$로 이루어진 삼각형 $ABC$와 그 외접원 $O$가 있다. 선분 $AB$의 길이는 $6$, 선분 $BC$의 길이는 $7$, 선분 $AC$의 길이는 $8$이다. 각 $BAC$의 이등분선이 선분 $BC$와 만나는 점을 $D$라 하고, 이 이등분선의 연장선이 외접원 $O$와 만나는 점 중 $A$가 아닌 점을 $E$라 하자. 선분 $BE$의 길이를 $x$, 선분 $AE$의 길이를 $y$라 할 때, $x+y$의 값은?

① 10
② 11
③ 12
④ 13
⑤ 14
[해설]
[풀이]
1. 각의 이등분선의 성질 적용
선분 $AD$가 $\angle BAC$의 이등분선이므로, 변의 길이의 비 성질에 의해
$BD : CD = AB : AC = 6 : 8 = 3 : 4$ 이다.
선분 $BC$의 길이가 $7$이므로
$BD = 7 \cdot \frac{3}{7} = 3$, $CD = 7 \cdot \frac{4}{7} = 4$ 이다.

2. 선분 $AD$의 길이 계산
삼각형 $ABC$에서 각의 이등분선 길이 공식에 의해 다음이 성립한다.
$AD^2 = AB \cdot AC - BD \cdot CD$
$AD^2 = 6 \cdot 8 - 3 \cdot 4 = 48 - 12 = 36$
$AD > 0$ 이므로 $AD = 6$ 이다.

3. 원주각의 성질과 이등변삼각형 유도
$\angle BAE = \angle CAE$ 이므로 두 원주각에 대응하는 호의 길이 $BE = CE$ 이다.
따라서 두 현의 길이도 같으므로 $BE = CE$ 이다. 즉, $x = BE = CE$ 이다.

4. 닮음을 통한 선분 $CE$와 $AE$의 길이 계산
삼각형 $ABD$와 삼각형 $ECD$에서,
호 $BE$에 대한 원주각의 크기가 같으므로 $\angle BAD = \angle ECD$ 이다.
또한 $\angle ADB = \angle EDC$ (맞꼭지각) 이므로 두 삼각형은 닮음이다 ($\triangle ABD \sim \triangle ECD$, AA 닮음).
닮음비에 의해 다음이 성립한다.
$AB : EC = AD : CD$
$6 : EC = 6 : 4 \implies EC = 4$
따라서 $x = BE = EC = 4$ 이다.

또한 할선 정리에 의해 두 현 $AE$와 $BC$의 교점 $D$에 대하여
$AD \cdot DE = BD \cdot CD$
$6 \cdot DE = 3 \cdot 4 = 12 \implies DE = 2$ 이다.
따라서 선분 $AE$의 길이 $y$는 다음과 같다.
$y = AE = AD + DE = 6 + 2 = 8$

5. 최종 값 계산
$x + y = 4 + 8 = 12$ 이다.
[정답] 3
---
<!-- BATCH:3 END -->
<!-- BATCH:4 START -->
---
[ref] 81쪽 [유형 04] 문제 22 삼각함수 - 사인법칙과 코사인법칙 유형 04
[문제]
22 (2분)
원 $O$에 내접하는 삼각형 $\mathrm{ABC}$가 있다. 원 $O$의 넓이는 $\frac{49}{3}\pi$ 이고 $\angle \mathrm{BAC} = 120^{\circ}$ 이다. 선분 $\mathrm{AC}$의 길이를 $b$, 선분 $\mathrm{AB}$의 길이를 $c$라 하자. 두 선분 길이 $b$와 $c$가 $x$에 대한 이차방정식 $x^2 - 8x + m = 0$의 서로 다른 두 실근일 때, 실수 $m$의 값은?

① 11
② 13
③ 15
④ 17
⑤ 19
[해설]
[풀이]
1. **외접원의 반지름과 선분 $\mathrm{BC}$의 길이 계산**
삼각형 $\mathrm{ABC}$의 외접원 $O$의 넓이가 $\frac{49}{3}\pi$이므로 외접원의 반지름의 길이는 $R = \frac{7}{\sqrt{3}}$ 이다.
선분 $\mathrm{BC}$의 길이를 $a$라 하면, 사인법칙에 의해
$\frac{a}{\sin(\angle \mathrm{BAC})} = 2R$
$a = 2 \cdot \frac{7}{\sqrt{3}} \cdot \sin 120^{\circ} = \frac{14}{\sqrt{3}} \cdot \frac{\sqrt{3}}{2} = 7$ 이다.

2. **근과 계수의 관계 적용**
$b, c$가 이차방정식 $x^2 - 8x + m = 0$의 두 실근이므로, 근과 계수의 관계에 의해 다음이 성립한다.
$b+c = 8$
$bc = m$

3. **코사인법칙을 통한 $m$의 유도**
삼각형 $\mathrm{ABC}$에서 코사인법칙을 적용하면,
$a^2 = b^2 + c^2 - 2bc \cos(\angle \mathrm{BAC})$
$7^2 = b^2 + c^2 - 2bc \cos 120^{\circ}$
$49 = (b+c)^2 - 2bc - 2bc \left(-\frac{1}{2}\right)$
$49 = (b+c)^2 - bc$
여기에 $b+c = 8$과 $bc = m$을 대입하면,
$49 = 8^2 - m$
$49 = 64 - m \implies m = 15$ 이다.

이차방정식 $x^2 - 8x + 15 = 0$의 두 근은 $3, 5$로 서로 다른 양의 실근이므로 삼각형의 두 변의 길이 조건을 잘 만족한다.
따라서 $m=15$ 이다.

[정답] 3
---
[ref] 81쪽 [유형 04] 문제 23 삼각함수 - 사인법칙과 코사인법칙 유형 04
[문제]
23 (2분)
선분 $\mathrm{AD}$와 선분 $\mathrm{BC}$가 서로 평행하고 선분 $\mathrm{AB}$와 선분 $\mathrm{CD}$의 길이가 같은 등변사다리꼴 $\mathrm{ABCD}$가 있다. 선분 $\mathrm{AB}$의 길이는 $5$, 대각선 $\mathrm{AC}$의 길이는 $7$ 이고, 등변사다리꼴 $\mathrm{ABCD}$의 높이는 $4$ 이다. 삼각형 $\mathrm{ABC}$의 외접원의 반지름의 길이를 $R_1$, 삼각형 $\mathrm{ACD}$의 외접원의 반지름의 길이를 $R_2$라 할 때, $R_1 \cdot R_2$의 값은? (단, $\overline{\mathrm{BC}} > \overline{\mathrm{AD}}$ 이다.)

① $\frac{1125}{64}$
② $\frac{1175}{64}$
③ $\frac{1225}{64}$
④ $\frac{1275}{64}$
⑤ $\frac{1325}{64}$
[해설]
[풀이]
1. **등변사다리꼴의 각 성질 파악**
선분 $\mathrm{AD} \parallel \mathrm{BC}$ 이고 $\overline{\mathrm{AB}} = \overline{\mathrm{CD}} = 5$인 등변사다리꼴 $\mathrm{ABCD}$의 밑각을 $\angle \mathrm{B} = \theta$라 하자.
등변사다리꼴의 성질에 의해 $\angle \mathrm{C} = \angle \mathrm{B} = \theta$ 이고, 평행선 사이의 각에 의해 $\angle \mathrm{ADC} = 180^{\circ} - \theta$ 이다.

2. **삼각형 $\mathrm{ABC}$의 외접원 반지름 $R_1$ 계산**
점 $\mathrm{A}$에서 선분 $\mathrm{BC}$에 내린 수선의 발을 $\mathrm{H}$라 하면, 직각삼각형 $\mathrm{ABH}$에서 $\overline{\mathrm{AB}}=5$ 이고 높이 $\overline{\mathrm{AH}}=4$ 이다.
따라서 $\sin \theta = \frac{\overline{\mathrm{AH}}}{\overline{\mathrm{AB}}} = \frac{4}{5}$ 이다.
삼각형 $\mathrm{ABC}$의 외접원의 반지름 $R_1$은 사인법칙에 의해
$2R_1 = \frac{\overline{\mathrm{AC}}}{\sin \theta} = \frac{7}{4/5} = \frac{35}{4} \implies R_1 = \frac{35}{8}$ 이다.

3. **삼각형 $\mathrm{ACD}$의 외접원 반지름 $R_2$ 계산**
삼각형 $\mathrm{ACD}$의 외접원의 반지름 $R_2$는 사인법칙에 의해
$2R_2 = \frac{\overline{\mathrm{AC}}}{\sin(\angle \mathrm{ADC})} = \frac{\overline{\mathrm{AC}}}{\sin(180^{\circ}-\theta)} = \frac{\overline{\mathrm{AC}}}{\sin \theta}$ 이다.
따라서 $2R_2 = \frac{7}{4/5} = \frac{35}{4} \implies R_2 = \frac{35}{8}$ 이다.
(등변사다리꼴에서 대각선에 의해 분할되는 두 삼각형의 외접원의 크기는 서로 동일하다.)

4. **두 반지름의 곱 계산**
$R_1 \cdot R_2 = \frac{35}{8} \cdot \frac{35}{8} = \frac{1225}{64}$ 이다.

[정답] 3
---
<!-- BATCH:4 END -->
<!-- BATCH:5 START -->
---
[ref] 82쪽 [유형 05] 문제 28
[문제]
28 (2분)
원 O에 내접하는 삼각형 ABC가 $\sin(B-C) = \sin A$ 를 만족시킨다. 점 B를 포함하지 않는 호 AC 위의 점 D에 대하여 $\overline{AD} = \overline{CD}$ 이다. 선분 BD가 선분 AC와 만나는 점을 E라 할 때, $\overline{AE} : \overline{CE} = 1 : 2$ 이다. 원 O의 반지름의 길이가 $5$일 때, 선분 BE의 길이는?
① $\frac{2\sqrt{10}}{3}$
② $\sqrt{10}$
③ $\frac{4\sqrt{10}}{3}$
④ $\frac{5\sqrt{10}}{3}$
⑤ $2\sqrt{10}$
[해설]
[풀이]
삼각형 ABC의 세 내각의 합은 $180^\circ$이므로 $A = 180^\circ - (B+C)$이다.
따라서 $\sin A = \sin(180^\circ - (B+C)) = \sin(B+C)$가 성립한다.
주어진 조건 $\sin(B-C) = \sin A$에 대입하면,
$\sin(B-C) = \sin(B+C)$
$\sin B\cos C - \cos B\sin C = \sin B\cos C + \cos B\sin C$
$2\cos B\sin C = 0$
이때 삼각형의 내각 $C$에 대하여 $\sin C > 0$이므로 $\cos B = 0$이어야 한다.
따라서 $\angle B = 90^\circ$임을 알 수 있다.

$\angle B = 90^\circ$이므로 선분 AC는 원 O의 지름이며, 원의 반지름이 $5$이므로 $\overline{AC} = 10$이다.
점 D는 점 B를 포함하지 않는 호 AC 위의 점이고 $\overline{AD} = \overline{CD}$이므로, 점 D는 반원의 호 AC의 중점이다.
따라서 선분 AC의 중점(원점)을 O라 할 때, $\triangle ODE$는 $\angle DOE = 90^\circ$인 직각삼각형이 되며 $\overline{OD} = 5$이다.
선분 AC 위에 있는 점 E는 $\overline{AE} : \overline{CE} = 1 : 2$를 만족하므로,
$\overline{AE} = 10 \times \frac{1}{3} = \frac{10}{3}$, $\overline{CE} = 10 \times \frac{2}{3} = \frac{20}{3}$이다.
이때 중심 O로부터 점 E까지의 거리 $\overline{OE}$는 $\overline{AO} - \overline{AE} = 5 - \frac{10}{3} = \frac{5}{3}$이다.

직각삼각형 ODE에서 피타고라스 정리에 의해 선분 DE의 길이를 구하면,
$\overline{DE} = \sqrt{\overline{OD}^2 + \overline{OE}^2} = \sqrt{5^2 + \left(\frac{5}{3}\right)^2} = \sqrt{25 + \frac{25}{9}} = \sqrt{\frac{250}{9}} = \frac{5\sqrt{10}}{3}$이다.

원 안에서 두 현 AC와 BD가 점 E에서 만나므로 방멱정리(원과 비례)에 의해 다음이 성립한다.
$\overline{AE} \times \overline{CE} = \overline{BE} \times \overline{DE}$
$\frac{10}{3} \times \frac{20}{3} = \overline{BE} \times \frac{5\sqrt{10}}{3}$
$\frac{200}{9} = \overline{BE} \times \frac{5\sqrt{10}}{3}$
$\overline{BE} = \frac{200}{9} \times \frac{3}{5\sqrt{10}} = \frac{40}{3\sqrt{10}} = \frac{4\sqrt{10}}{3}$
[팁]
이 문항은 삼각함수의 덧셈정리(또는 합차공식의 원리)를 활용하여 직각을 찾아내고, 좌표나 방멱정리를 교차하여 해결하는 전형적인 기하+해석 복합 문항입니다. 직각삼각형의 외접원 지름 성질과 방멱정리($\overline{AE}\times\overline{CE}=\overline{BE}\times\overline{DE}$)를 기억하면 복잡한 좌표 계산 없이 시간을 크게 단축할 수 있습니다.
[정답] 3
---
[ref] 82쪽 [유형 05] 문제 29
[문제]
29 (2분)
자연수 $n$에 대하여 $\overline{AB}=n$, $\overline{BC}=15-n$, $\overline{CA}=n+3$ 인 삼각형 ABC가 있다. 삼각형 ABC의 세 꼭짓점 A, B, C에서 각각의 대변 또는 그 연장선에 내린 세 수선이 만나는 교점이 삼각형 ABC의 외부에 존재하도록 하는 모든 자연수 $n$의 값의 합은?
① 40
② 41
③ 42
④ 43
⑤ 44
[해설]
[풀이]
삼각형의 세 꼭짓점에서 내린 수선의 교점(수심)이 외부에 존재한다는 것은 해당 삼각형이 둔각삼각형임을 의미한다.
따라서 이 문제는 주어진 세 변의 길이를 가지는 삼각형이 둔각삼각형이 될 자연수 $n$의 조건을 찾는 문제이다.

먼저 삼각형의 성립 조건을 확인한다. (가장 긴 변의 길이 < 나머지 두 변의 길이의 합)
세 변의 길이는 양수이어야 하므로 $n>0$, $15-n>0$에서 $0<n<15$이다.
세 가지 경우의 부등식을 모두 만족해야 한다.
1) $n + (15-n) > n+3 \Rightarrow n < 12$
2) $n + (n+3) > 15-n \Rightarrow 3n > 12 \Rightarrow n > 4$
3) $(15-n) + (n+3) > n \Rightarrow 18 > n$
공통 범위를 구하면 $4 < n < 12$이다.

다음으로 둔각삼각형이 될 조건을 구한다. 가장 긴 변의 제곱이 나머지 두 변의 제곱의 합보다 커야 한다.
$4 < n < 12$ 범위에서 가장 긴 변을 판별하기 위해 $15-n$과 $n+3$의 대소를 비교한다.
$15-n \ge n+3$ 풀면 $2n \le 12 \Rightarrow n \le 6$이다.
따라서 $n$의 값에 따라 가장 긴 변이 달라지므로 두 가지 경우로 나누어 푼다.

(Case 1) $n \le 6$일 때 ($n=5, 6$)
가장 긴 변은 $15-n$이다. 둔각 조건에 의해,
$(15-n)^2 > n^2 + (n+3)^2$
$225 - 30n + n^2 > 2n^2 + 6n + 9$
$n^2 + 36n - 216 < 0$
$n=5$ 대입: $25 + 180 - 216 = -11 < 0$ (성립)
$n=6$ 대입: $36 + 216 - 216 = 36 \not< 0$ (불성립, 이 경우 직각 또는 예각삼각형)
따라서 이 구간에서 만족하는 자연수는 $n=5$이다.

(Case 2) $n \ge 7$일 때 ($n=7, 8, 9, 10, 11$)
가장 긴 변은 $n+3$이다. 둔각 조건에 의해,
$(n+3)^2 > n^2 + (15-n)^2$
$n^2 + 6n + 9 > 2n^2 - 30n + 225$
$n^2 - 36n + 216 < 0$
$n=7$ 대입: $49 - 252 + 216 = 13 \not< 0$ (불성립)
$n=8$ 대입: $64 - 288 + 216 = -8 < 0$ (성립)
$n=9$ 대입: $81 - 324 + 216 = -27 < 0$ (성립)
$n=10$ 대입: $100 - 360 + 216 = -44 < 0$ (성립)
$n=11$ 대입: $121 - 396 + 216 = -59 < 0$ (성립)
따라서 이 구간에서 만족하는 자연수는 $n=8, 9, 10, 11$이다.

(Case 1)과 (Case 2)를 종합하면 조건을 만족하는 모든 자연수 $n$은 $5, 8, 9, 10, 11$이다.
이들의 합은 $5 + 8 + 9 + 10 + 11 = 43$이다.
[팁]
'수심이 외부에 존재한다'는 기하학적 서술을 '둔각삼각형'이라는 대수적 조건으로 신속히 번역하는 것이 핵심입니다. 또한, 미지수 $n$이 포함된 세 변의 길이가 주어졌을 때는 $n$의 구간에 따라 '가장 긴 변'이 역전될 수 있음을 반드시 인지하고 분기(Case)를 나누어 접근해야 오답(예각 구간을 잘못 포함하는 실수)을 피할 수 있습니다.
[정답] 4
---
<!-- BATCH:5 END -->
<!-- BATCH:6 START -->
[ref] 83쪽 [유형 06] 문제 34 삼각함수 - 사인법칙과 코사인법칙 유형 06
[문제]
34 (2분)
평면 위에 중심이 $O$이고 넓이가 $4\pi$인 원이 있다. 이 원 위에 세 점 $A, B, C$를 $\angle ABC < 90^\circ$가 되도록 잡는다. 삼각형 $ABC$에 대하여 $\overline{CA} = 2\sqrt{3}$이고, $\overline{AB}^3 + \overline{BC}^3 = 72$를 만족시킨다.
원 $O$ 위의 점 $D$를 사각형 $ABCD$가 볼록사각형이 되도록 잡는다. 사각형 $ABCD$의 넓이가 최대가 될 때, 사각형 $ABCD$의 둘레의 길이는? (단, $\overline{AB} < \overline{BC}$이다.)
① $8$
② $9$
③ $10$
④ $6+2\sqrt{3}$
⑤ $6+4\sqrt{3}$
[해설]
[풀이]
원 $O$의 넓이가 $4\pi$이므로 외접원의 반지름의 길이는 $R=2$이다.
삼각형 $ABC$에서 사인법칙에 의해 $\sin(\angle ABC) = \frac{\overline{CA}}{2R} = \frac{2\sqrt{3}}{4} = \frac{\sqrt{3}}{2}$이다.
$\angle ABC < 90^\circ$이므로 $\angle ABC = 60^\circ$이다.
편의상 $\overline{BC}=a, \overline{AB}=c$라 하면, 삼각형 $ABC$에서 코사인법칙에 의해
$(2\sqrt{3})^2 = a^2 + c^2 - 2ac \cos 60^\circ$ 이 성립하므로, $a^2 - ac + c^2 = 12$ 이다.
주어진 조건에서 $a^3 + c^3 = 72$ 이므로 곱셈 공식의 변형에 의해
$(a+c)(a^2 - ac + c^2) = 72$ 가 성립한다.
따라서 $(a+c) \times 12 = 72$ 에서 $a+c = 6$ 이다.

한편, 세 점 $A, B, C$는 고정되어 있으므로 사각형 $ABCD$의 넓이가 최대가 되려면 삼각형 $ADC$의 넓이가 최대가 되어야 한다.
현 $AC$가 고정되어 있을 때 삼각형 $ADC$의 높이가 최대이려면, 점 $D$는 호 $AC$(점 $B$를 포함하지 않는 호)의 중점이어야 한다.
즉, 삼각형 $ADC$는 $\overline{AD} = \overline{CD}$인 이등변삼각형이 된다.
볼록사각형 $ABCD$는 원에 내접하므로 마주 보는 각의 합은 $180^\circ$이다. 따라서 $\angle ADC = 180^\circ - 60^\circ = 120^\circ$ 이다.
삼각형 $ADC$에서 $\overline{AD} = \overline{CD} = x$ 라 하고 코사인법칙을 적용하면
$(2\sqrt{3})^2 = x^2 + x^2 - 2x^2 \cos 120^\circ \Rightarrow 12 = 3x^2$ 이 되어 $x = 2$ 이다.
따라서 사각형 $ABCD$의 둘레의 길이는
$\overline{AB} + \overline{BC} + \overline{CD} + \overline{DA} = c + a + 2 + 2 = (a+c) + 4 = 6 + 4 = 10$ 이다.
[팁]
세제곱의 합 $a^3+c^3$이 주어졌을 때, 코사인법칙으로 얻은 $a^2-ac+c^2$의 값을 활용하여 인수분해 공식 $a^3+c^3 = (a+c)(a^2-ac+c^2)$을 적용하면 복잡한 연립방정식을 풀지 않고도 두 변의 길이의 합을 한 번에 도출할 수 있습니다. 또한, 내접 사각형의 넓이가 최대가 되려면 고정된 현을 밑변으로 할 때 높이가 최대가 되어야 하므로, 곡선 상의 점이 현의 수직이등분선 위에 위치해야 함을 직관적으로 파악하는 것이 중요합니다.
[정답] 3
---
[ref] 83쪽 [유형 06] 문제 35 삼각함수 - 사인법칙과 코사인법칙 유형 06
[문제]
35 (2분)
평면 위에 세 점 $A, B, C$가 있다. 선분 $AC$와 선분 $BC$가 이루는 각 $\angle ACB$의 크기는 $120^\circ$이다. $\angle ACB$의 이등분선이 선분 $AB$와 만나는 점을 $D$라 할 때, $\overline{CD}=2$를 만족시킨다. 점 $C$에서 직선 $AB$에 내린 수선의 발을 $H$라 할 때, 선분 $CH$의 길이의 최댓값은?
① $\sqrt{2}$
② $\sqrt{3}$
③ $2$
④ $\sqrt{5}$
⑤ $2\sqrt{2}$
[해설]
[풀이]
삼각형 $ABC$에서 $\overline{BC}=a, \overline{CA}=b, \overline{AB}=c$라 하자.
$\angle C = 120^\circ$의 이등분선이 $AB$와 만나는 점 $D$에 대하여, 삼각형의 넓이 분할 원리($\triangle ABC = \triangle ACD + \triangle BCD$)를 적용하면 다음과 같다.
$\frac{1}{2}ab \sin 120^\circ = \frac{1}{2}b \cdot \overline{CD} \sin 60^\circ + \frac{1}{2}a \cdot \overline{CD} \sin 60^\circ$
$\frac{\sqrt{3}}{4} ab = \frac{\sqrt{3}}{4} b \cdot 2 + \frac{\sqrt{3}}{4} a \cdot 2 = \frac{\sqrt{3}}{2} (a+b)$
따라서 $ab = 2(a+b)$ 라는 관계식이 성립한다.
$a>0, b>0$ 이므로 산술·기하 평균의 관계에 의해 $a+b \ge 2\sqrt{ab}$ (단, 등호는 $a=b$일 때 성립)이다.
이를 대입하면 $\frac{ab}{2} \ge 2\sqrt{ab} \Rightarrow \sqrt{ab} \ge 4 \Rightarrow ab \ge 16$ 이다.

한편, 점 $C$에서 직선 $AB$에 내린 수선의 길이를 $h$ ($h = \overline{CH}$)라 하면, $\triangle ABC$의 넓이 $S$는
$S = \frac{1}{2} c h = \frac{\sqrt{3}}{4} ab$ 이므로 $h = \frac{\sqrt{3}ab}{2c}$ 가 된다.
삼각형 $ABC$에서 코사인법칙을 쓰면
$c^2 = a^2 + b^2 - 2ab \cos 120^\circ = (a+b)^2 - ab$ 이다.
앞서 구한 $a+b = \frac{ab}{2}$ 를 대입하면 $c^2 = \frac{(ab)^2}{4} - ab$ 이다.
이를 $h^2$의 식에 대입하여 정리하면
$h^2 = \frac{3(ab)^2}{4c^2} = \frac{3(ab)^2}{4 \left( \frac{(ab)^2}{4} - ab \right)} = \frac{3(ab)^2}{(ab)^2 - 4ab} = \frac{3ab}{ab - 4} = \frac{3}{1 - \frac{4}{ab}}$
이 식에서 $h$가 최대가 되려면 분모인 $1 - \frac{4}{ab}$ 가 최소가 되어야 하고, 이는 곧 $\frac{4}{ab}$ 가 최대(즉, $ab$가 최소)가 될 때이다.
$ab \ge 16$ 이므로 $\frac{4}{ab}$ 의 최댓값은 $\frac{1}{4}$ 이다.
따라서 분모의 최솟값은 $1 - \frac{1}{4} = \frac{3}{4}$ 이므로, $h^2 \le \frac{3}{\frac{3}{4}} = 4$ 가 된다.
$h>0$ 이므로 수선의 길이 $h$의 최댓값은 $2$이다.
(이때 등호는 $a=b=4$ 인 이등변삼각형일 때 성립한다.)
[팁]
삼각형의 넓이는 한없이 커질 수 있지만, 수선의 길이는 특정 값으로 수렴하거나 최댓값을 가질 수 있습니다. 각의 이등분선 정리를 통해 두 변의 곱과 합의 관계를 도출한 뒤, 산술·기하 평균의 관계를 이용하여 두 변의 길이의 곱($ab$)의 최솟값을 찾아내는 것이 이 문제의 핵심입니다. 분수 함수의 최댓값을 구할 때는 분모, 분자를 변수로 나누어 $1 - \frac{k}{x}$ 꼴로 변형하면 값의 증감을 명확하고 직관적으로 파악할 수 있습니다.
[정답] 3
---
<!-- BATCH:6 END -->
<!-- BATCH:7 START -->
---
[ref] 84쪽 [유형 07] 문제 40 삼각함수 - 사인법칙과 코사인법칙 유형 07
[문제]
40 (2분)
원 $O$에 내접하는 삼각형 $\mathrm{ABC}$가 있다. $\angle \mathrm{ABC} = 30^{\circ}$, $\angle \mathrm{BCA} = 45^{\circ}$ 이고, 원 $O$의 중심 $O$에 대하여 삼각형 $\mathrm{OAB}$의 넓이는 $8$ 이다. 선분 $\mathrm{BC}$의 길이의 제곱을 $\overline{\mathrm{BC}}^2 = p + q\sqrt{3}$ 이라 할 때, $p+q$의 값을 구하시오. (단, $p$와 $q$는 자연수이다.)

① 42
② 45
③ 48
④ 51
⑤ 54
[해설]
[full_proof]
[풀이]
1. **외접원의 반지름 계산**
원 $O$의 반지름의 길이를 $R$이라 하자.
삼각형 $\mathrm{OAB}$에서 선분 $\mathrm{OA} = \overline{\mathrm{OB}} = R$ 이다.
호 $\mathrm{AB}$에 대한 원주각 $\angle \mathrm{BCA} = 45^{\circ}$이므로, 중심각 $\angle \mathrm{AOB} = 2 \times 45^{\circ} = 90^{\circ}$ 이다.
따라서 삼각형 $\mathrm{OAB}$는 직각이등변삼각형이다.
삼각형 $\mathrm{OAB}$의 넓이가 $8$이므로,
$\frac{1}{2} R^2 = 8 \implies R^2 = 16 \implies R = 4$ ($R>0$) 이다.

2. **삼각형 $\mathrm{ABC}$의 내각 $\mathrm{A}$의 크기 및 사인값 계산**
삼각형 $\mathrm{ABC}$의 내각의 합은 $180^{\circ}$이므로,
$\angle \mathrm{BAC} = 180^{\circ} - (30^{\circ} + 45^{\circ}) = 105^{\circ}$ 이다.
삼각함수의 덧셈정리에 의해 $\sin 105^{\circ}$의 값을 구하면,
$\sin 105^{\circ} = \sin(60^{\circ} + 45^{\circ}) = \sin 60^{\circ}\cos 45^{\circ} + \cos 60^{\circ}\sin 45^{\circ}$
$= \frac{\sqrt{3}}{2} \cdot \frac{\sqrt{2}}{2} + \frac{1}{2} \cdot \frac{\sqrt{2}}{2} = \frac{\sqrt{6}+\sqrt{2}}{4}$ 이다.

3. **선분 $\mathrm{BC}$의 길이 및 제곱 계산**
사인법칙에 의해,
$\frac{\overline{\mathrm{BC}}}{\sin(\angle \mathrm{BAC})} = 2R$
$\overline{\mathrm{BC}} = 2R \sin 105^{\circ} = 2 \cdot 4 \cdot \frac{\sqrt{6}+\sqrt{2}}{4} = 2(\sqrt{6}+\sqrt{2})$ 이다.
따라서 선분 $\mathrm{BC}$의 길이의 제곱은
$\overline{\mathrm{BC}}^2 = \{2(\sqrt{6}+\sqrt{2})\}^2 = 4(6 + 2 + 2\sqrt{12}) = 4(8 + 4\sqrt{3}) = 32 + 16\sqrt{3}$ 이다.

이때 $p=32, q=16$ 이므로 $p+q = 32 + 16 = 48$ 이다.

[정답] 3
---
[ref] 84쪽 [유형 07] 문제 41 삼각함수 - 사인법칙과 코사인법칙 유형 07
[문제]
41 (2분)
삼각형 $\mathrm{ABC}$가 있다. 선분 $\mathrm{AC}$와 선분 $\mathrm{BC}$가 이루는 각 $\angle \mathrm{ACB}$의 크기는 $120^{\circ}$ 이다. 각 $\angle \mathrm{ACB}$의 이등분선이 선분 $\mathrm{AB}$와 만나는 점을 $\mathrm{D}$라 할 때, 선분 $\mathrm{CD}$의 길이는 $4$ 이다. 삼각형 $\mathrm{ABC}$의 넓이의 최솟값은?

① $12\sqrt{3}$
② $14\sqrt{3}$
③ $16\sqrt{3}$
④ $18\sqrt{3}$
⑤ $20\sqrt{3}$
[해설]
[풀이]
1. **변의 길이 사이의 관계식 유도**
선분 $\mathrm{BC}$의 길이를 $a$, 선분 $\mathrm{AC}$의 길이를 $b$라 하자.
선분 $\mathrm{CD}$는 $\angle \mathrm{ACB}$의 이등분선이므로 $\angle \mathrm{ACD} = \angle \mathrm{BCD} = 60^{\circ}$ 이다.
삼각형 $\mathrm{ABC}$의 넓이는 두 삼각형 $\mathrm{ACD}$와 $\mathrm{BCD}$의 넓이의 합과 같으므로,
$\frac{1}{2} ab \sin 120^{\circ} = \frac{1}{2} b \cdot \overline{\mathrm{CD}} \sin 60^{\circ} + \frac{1}{2} a \cdot \overline{\mathrm{CD}} \sin 60^{\circ}$
$\sin 120^{\circ} = \sin 60^{\circ}$ 이고 $\overline{\mathrm{CD}} = 4$ 이므로,
$ab = 4(a+b)$ 가 성립한다.

2. **산술·기하 평균을 이용한 $ab$의 최솟값 도출**
변의 길이는 양수이므로 $a>0, b>0$ 이다. 산술·기하 평균의 관계에 의해
$a+b \ge 2\sqrt{ab}$ (단, 등호는 $a=b$일 때 성립)
이 관계식을 $ab = 4(a+b)$ 에 대입하면,
$ab \ge 4 \cdot 2\sqrt{ab} = 8\sqrt{ab}$
양변을 $\sqrt{ab}$ ($\sqrt{ab}>0$)로 나누고 제곱하면,
$\sqrt{ab} \ge 8 \implies ab \ge 64$ 이다.

3. **삼각형 $\mathrm{ABC}$의 넓이의 최솟값 계산**
삼각형 $\mathrm{ABC}$의 넓이 $S$는
$S = \frac{1}{2} ab \sin 120^{\circ} = \frac{\sqrt{3}}{4} ab$ 이다.
$ab \ge 64$ 이므로,
$S \ge \frac{\sqrt{3}}{4} \cdot 64 = 16\sqrt{3}$ 이다.
따라서 삼각형 $\mathrm{ABC}$의 넓이의 최솟값은 $16\sqrt{3}$ 이다.

[정답] 3
---
<!-- BATCH:7 END -->
<!-- BATCH:8 START -->
[ref] 85쪽 [유형 08] 문제 45 삼각함수 - 사인법칙과 코사인법칙 유형 08
[문제]
45 (2분)
원 O에 내접하는 사각형 ABCD가 있다. 선분 AD와 선분 BC가 서로 평행하고, 삼각형 BCD의 넓이는 10\sqrt{3}이다. 사각형 ABCD의 둘레의 길이가 21이고 선분 CD의 길이가 5일 때, 대각선 AC의 길이는? (단, 선분 BC의 길이는 자연수이고, BC > AD 이다.)
① 5
② 6
③ 7
④ 8
⑤ 9
[해설]
[풀이]
1. 사각형 ABCD는 원 O에 내접하고, 선분 AD와 선분 BC가 평행하므로 등변사다리꼴이다. 따라서 선분 AB = 선분 CD = 5이다.
2. 사각형 ABCD의 둘레의 길이가 21이므로, AB + BC + CD + AD = 21에서 5 + BC + 5 + AD = 21, 즉 BC + AD = 11이다.
3. 점 D에서 선분 BC에 내린 수선의 발을 H라 하고, 선분 CH의 길이를 x라 하자.
   등변사다리꼴의 성질에 의해 AD = BC - 2x 가 성립한다.
   BC + AD = 11에 대입하면, BC + (BC - 2x) = 11, 즉 2 BC - 2x = 11 이므로 x = BC - 11/2 이다.
4. 직각삼각형 DHC에서 피타고라스 정리에 의해 높이 DH = \sqrt{CD^2 - x^2} = \sqrt{25 - (BC - 11/2)^2} 이다.
5. 삼각형 BCD의 넓이는 1/2 × BC × DH = 10\sqrt{3} 이므로, BC × DH = 20\sqrt{3} 이다.
   양변을 제곱하면 BC^2 × DH^2 = 1200 이고, DH^2을 대입하면 BC^2 { 25 - (BC - 11/2)^2 } = 1200 이다.
6. 선분 BC의 길이는 자연수이므로, 식을 전개하여 만족하는 자연수를 찾는다.
   BC = 8을 대입하면, 8^2 × { 25 - (8 - 11/2)^2 } = 64 × { 25 - (5/2)^2 } = 64 × (25 - 25/4) = 64 × (75/4) = 16 × 75 = 1200.
   따라서 등식을 만족하는 자연수 BC의 길이는 8이다. (이때 AD = 11 - 8 = 3 이므로 BC > AD 조건도 만족한다.)
7. BC = 8이므로, x = 8 - 11/2 = 5/2 이다.
   직각삼각형 DHC에서 cos C = x / CD = (5/2) / 5 = 1/2 이므로 ∠C = 60° 이다.
   등변사다리꼴이므로 ∠B = ∠C = 60° 이다.
8. 삼각형 ABC에서 코사인법칙을 적용하면,
   AC^2 = AB^2 + BC^2 - 2 × AB × BC × cos B
        = 5^2 + 8^2 - 2 × 5 × 8 × (1/2)
        = 25 + 64 - 40 = 49.
   따라서 대각선 AC의 길이는 7이다.
[팁]
원 내접 사각형에서 한 쌍의 대변이 평행하면 반드시 등변사다리꼴이 되며, 대각선의 길이가 서로 같다는 기하학적 직관을 활용하면 복잡한 변수 설정을 줄일 수 있습니다.
[정답] 3
---
---
[ref] 85쪽 [유형 08] 문제 46 삼각함수 - 사인법칙과 코사인법칙 유형 08
[문제]
46 (2분)
원 O에 내접하는 삼각형 ABC가 있다. 각 A의 이등분선이 원 O와 만나는 점 중 A가 아닌 점을 D라 하자. 사각형 ABDC의 넓이가 16\sqrt{2} 이고 대각선 AD의 길이가 4\sqrt{3} 이다. 선분 AC의 길이가 선분 AB의 길이보다 2만큼 더 길고 각 A가 둔각일 때, 선분 BC의 길이의 제곱은?
① 40
② 42
③ 44
④ 46
⑤ 48
[해설]
[풀이]
1. 각 A의 이등분선이 원과 만나는 점이 D이므로, 원주각의 성질에 의해 호 BD와 호 CD의 길이가 같고, 따라서 현 BD와 현 CD의 길이는 같다. (BD = CD)
2. ∠BAD = ∠CAD = θ라 하면, 삼각형 ABD와 삼각형 ACD에서 코사인법칙을 적용할 수 있다.
   BD^2 = AB^2 + AD^2 - 2 × AB × AD × cos θ
   CD^2 = AC^2 + AD^2 - 2 × AC × AD × cos θ
   BD = CD 이므로 두 식을 빼면,
   AB^2 - AC^2 - 2 × AD × cos θ × (AB - AC) = 0 이다.
3. (AB - AC)(AB + AC - 2 × AD × cos θ) = 0 에서 선분 AC가 선분 AB보다 길다고 했으므로 AB - AC ≠ 0 이다.
   따라서 AB + AC = 2 × AD × cos θ 이다.
   AD = 4\sqrt{3} 이므로 AB + AC = 8\sqrt{3} cos θ 이다.
4. 사각형 ABDC의 넓이는 두 삼각형의 넓이의 합과 같다.
   넓이 = 1/2 × AB × AD × sin θ + 1/2 × AC × AD × sin θ
        = 1/2 × (AB + AC) × AD × sin θ
        = 1/2 × (8\sqrt{3} cos θ) × (4\sqrt{3}) × sin θ = 48 sin θ cos θ = 24 sin 2θ.
   조건에서 사각형 ABDC의 넓이가 16\sqrt{2} 이므로,
   24 sin 2θ = 16\sqrt{2}, 즉 sin 2θ = 2\sqrt{2}/3 이다.
5. 각 A(= 2θ)가 둔각이므로 cos 2θ < 0 이다.
   cos^2 2θ = 1 - sin^2 2θ = 1 - 8/9 = 1/9 이므로, cos 2θ = -1/3 이다.
6. 반각 공식(또는 코사인 덧셈 정리의 변형)에 의해 cos^2 θ = (1 + cos 2θ) / 2 = (1 - 1/3) / 2 = 1/3 이다.
   θ는 예각이므로 cos θ = \sqrt{3}/3 이다.
7. 따라서 AB + AC = 8\sqrt{3} × (\sqrt{3}/3) = 8 이다.
   조건에서 AC - AB = 2 이므로, 연립하여 풀면 AB = 3, AC = 5 이다.
8. 마지막으로 삼각형 ABC에서 코사인법칙을 적용하면,
   BC^2 = AB^2 + AC^2 - 2 × AB × AC × cos(2θ)
        = 3^2 + 5^2 - 2 × 3 × 5 × (-1/3)
        = 9 + 25 + 10 = 44.
[팁]
결과로 제시된 사각형의 넓이를 두 삼각형의 넓이의 합으로 분해하고, 공통현(BD=CD)의 코사인법칙을 연립해 두 변의 합을 구하는 발상의 전환은 수능 4점 문항에서 자주 쓰이는 역추론 구조입니다.
[정답] 3
---
<!-- BATCH:8 END -->
<!-- BATCH:9 START -->
---
[ref] 86쪽 [서술형 완성하기] 문제 1 삼각함수 - 사인법칙과 코사인법칙 서술형 완성하기
[문제]
1 (2분)
원 $O$에 내접하는 삼각형 $\mathrm{ABC}$가 있다. 점 $\mathrm{C}$를 포함하지 않는 호 $\mathrm{AB}$의 길이를 $x$, 점 $\mathrm{A}$를 포함하지 않는 호 $\mathrm{BC}$의 길이를 $y$, 점 $\mathrm{B}$를 포함하지 않는 호 $\mathrm{CA}$의 길이를 $z$라 할 때, $x : y : z = 4 : 3 : 5$ 가 성립한다. 삼각형 $\mathrm{ABC}$의 외접원의 넓이가 $36\pi$ 일 때, 선분 $\mathrm{BC}$의 길이를 구하는 과정을 다음 단계에 따라 서술하시오.

[단계 1] 호의 길이 비를 이용하여 세 내각 $\angle \mathrm{A}$, $\angle \mathrm{B}$, $\angle \mathrm{C}$의 크기를 각각 구한다.
[단계 2] 외접원 넓이를 이용하여 외접원의 반지름의 길이 $R$을 구한다.
[단계 3] 사인법칙을 적용하여 선분 $\mathrm{BC}$의 길이를 구한다.

① $3\sqrt{2}$
② $4\sqrt{2}$
③ $6\sqrt{2}$
④ $6\sqrt{3}$
⑤ $8\sqrt{2}$
[해설]
[풀이]
1. **[단계 1] 세 내각의 크기 구하기**
원 $O$에서 각 호에 대한 원주각의 크기는 호의 길이에 정비례한다.
각 $\mathrm{C}$는 호 $\mathrm{AB}$의 원주각, 각 $\mathrm{A}$는 호 $\mathrm{BC}$의 원주각, 각 $\mathrm{B}$는 호 $\mathrm{CA}$의 원주각이므로,
$\angle \mathrm{C} : \angle \mathrm{A} : \angle \mathrm{B} = x : y : z = 4 : 3 : 5$ 이다.
삼각형의 내각의 합은 $180^{\circ}$이므로,
$\angle \mathrm{A} = 180^{\circ} \times \frac{3}{4+3+5} = 45^{\circ}$
$\angle \mathrm{B} = 180^{\circ} \times \frac{5}{12} = 75^{\circ}$
$\angle \mathrm{C} = 180^{\circ} \times \frac{4}{12} = 60^{\circ}$ 이다.

2. **[단계 2] 외접원 반지름 $R$ 구하기**
삼각형 $\mathrm{ABC}$의 외접원의 넓이가 $36\pi$이므로,
$\pi R^2 = 36\pi \implies R^2 = 36 \implies R = 6$ ($R>0$) 이다.

3. **[단계 3] 선분 $\mathrm{BC}$의 길이 계산**
선분 $\mathrm{BC}$의 길이를 $a$라 하면, 대각은 $\angle \mathrm{A} = 45^{\circ}$ 이다.
사인법칙에 의해,
$\frac{a}{\sin \mathrm{A}} = 2R$
$a = 2 \cdot 6 \cdot \sin 45^{\circ} = 12 \cdot \frac{\sqrt{2}}{2} = 6\sqrt{2}$ 이다.
따라서 선분 $\mathrm{BC}$의 길이는 $6\sqrt{2}$ 이다.

[정답] 3
---
[ref] 86쪽 [서술형 완성하기] 문제 2 삼각함수 - 사인법칙과 코사인법칙 서술형 완성하기
[문제]
2 (2분)
선분 $\mathrm{AB}$의 길이는 $5$, 선분 $\mathrm{BC}$의 길이는 $4$ 이고, 선분 $\mathrm{CA}$의 길이를 $b$라 하는 삼각형 $\mathrm{ABC}$가 있다. $b$가 짝수인 자연수일 때, $\cos \mathrm{B}$의 최댓값을 $M$, 최솟값을 $m$이라 하자. $M-m$의 값을 구하는 과정을 다음 단계에 따라 서술하시오.

[단계 1] 삼각형이 성립할 수 있는 변 $b$의 범위를 구하고, 가능한 짝수 $b$의 값을 모두 나열한다.
[단계 2] 코사인법칙을 사용하여 $\cos \mathrm{B}$의 값을 $b$에 관한 식으로 나타낸다.
[단계 3] $\cos \mathrm{B}$의 최댓값 $M$과 최솟값 $m$을 구하고, $M-m$의 값을 계산한다.

① $\frac{11}{10}$
② $\frac{6}{5}$
③ $\frac{13}{10}$
④ $\frac{7}{5}$
⑤ $\frac{3}{2}$
[해설]
[풀이]
1. **[단계 1] 변 $b$의 범위 구하기**
삼각형의 결정 조건에 의해 가장 긴 변은 나머지 두 변의 합보다 작아야 하고, 두 변의 차보다는 커야 한다.
$|5-4| < b < 5+4 \implies 1 < b < 9$ 이다.
이 범위에 속하는 짝수인 자연수 $b$는 $2, 4, 6, 8$ 이다.

2. **[단계 2] 코사인법칙을 통한 식 세우기**
삼각형 $\mathrm{ABC}$에서 코사인법칙을 적용하여 $\cos \mathrm{B}$를 구하면,
$\cos \mathrm{B} = \frac{\overline{\mathrm{AB}}^2 + \overline{\mathrm{BC}}^2 - \overline{\mathrm{CA}}^2}{2 \cdot \overline{\mathrm{AB}} \cdot \overline{\mathrm{BC}}}$
$= \frac{5^2 + 4^2 - b^2}{2 \cdot 5 \cdot 4} = \frac{41 - b^2}{40}$ 이다.

3. **[단계 3] 최댓값과 최솟값 계산**
$\cos \mathrm{B} = \frac{41-b^2}{40}$ 은 $b^2$에 대해 감소하므로,
- $b$가 가장 작은 값인 $b=2$ 일 때 최댓값 $M$을 갖는다.
  $M = \frac{41 - 2^2}{40} = \frac{37}{40}$
- $b$가 가장 큰 값인 $b=8$ 일 때 최솟값 $m$을 갖는다.
  $m = \frac{41 - 8^2}{40} = \frac{41 - 64}{40} = -\frac{23}{40}$
따라서 $M-m = \frac{37}{40} - \left(-\frac{23}{40}\right) = \frac{60}{40} = \frac{3}{2}$ 이다.

[정답] 5
---
[ref] 86쪽 [서술형 완성하기] 문제 3 삼각함수 - 사인법칙과 코사인법칙 서술형 완성하기
[문제]
3 (2분)
선분 $\mathrm{AD}$와 선분 $\mathrm{BC}$가 서로 평행한 사다리꼴 $\mathrm{ABCD}$가 있다. 대각선 $\mathrm{AC}$의 길이는 $8$, 선분 $\mathrm{AD}$의 길이는 $3$, 선분 $\mathrm{BC}$의 길이는 $9$, 선분 $\mathrm{CD}$의 길이는 $6$ 일 때, 선분 $\mathrm{AB}$의 길이를 구하는 과정을 다음 단계에 따라 서술하시오.

[단계 1] 삼각형 $\mathrm{ACD}$에서 코사인법칙을 적용하여 $\cos(\angle \mathrm{ADC})$의 값을 구한다.
[단계 2] 점 $\mathrm{A}$와 점 $\mathrm{D}$에서 직선 $\mathrm{BC}$에 내린 수선의 발을 각각 $\mathrm{H}_1, \mathrm{H}_2$라 할 때, 선분 $\mathrm{CH}_2$의 길이를 구한다.
[단계 3] 선분 $\mathrm{BH}_1$의 길이를 구하고, 직각삼각형 $\mathrm{ABH}_1$에서 피타고라스의 정리를 활용하여 선분 $\mathrm{AB}$의 길이를 구한다.

① $2\sqrt{7}$
② $\sqrt{30}$
③ $4\sqrt{2}$
④ $\sqrt{34}$
⑤ $6$
[해설]
[풀이]
1. **[단계 1] $\cos(\angle \mathrm{ADC})$ 구하기**
삼각형 $\mathrm{ACD}$에서 세 변의 길이는 $\overline{\mathrm{AD}}=3, \overline{\mathrm{CD}}=6, \overline{\mathrm{AC}}=8$ 이므로, 코사인법칙에 의해
$\cos(\angle \mathrm{ADC}) = \frac{\overline{\mathrm{AD}}^2 + \overline{\mathrm{CD}}^2 - \overline{\mathrm{AC}}^2}{2 \cdot \overline{\mathrm{AD}} \cdot \overline{\mathrm{CD}}}$
$= \frac{3^2 + 6^2 - 8^2}{2 \cdot 3 \cdot 6} = \frac{9+36-64}{36} = -\frac{19}{36}$ 이다.

2. **[단계 2] 선분 $\mathrm{CH}_2$의 길이 계산**
사다리꼴 $\mathrm{ABCD}$에서 $\overline{\mathrm{AD}} \parallel \mathrm{BC}$ 이므로 $\angle \mathrm{ADC} + \angle \mathrm{DCB} = 180^{\circ}$ 이다.
점 $\mathrm{D}$에서 선분 $\mathrm{BC}$에 내린 수선의 발이 $\mathrm{H}_2$이므로, 직각삼각형 $\mathrm{DCH}_2$에서 $\angle \mathrm{DCH}_2 = 180^{\circ} - \angle \mathrm{ADC}$ 이다.
$\cos(\angle \mathrm{DCH}_2) = \cos(180^{\circ} - \angle \mathrm{ADC}) = -\cos(\angle \mathrm{ADC}) = \frac{19}{36}$ 이다.
따라서 $\overline{\mathrm{CH}_2} = \overline{\mathrm{CD}} \cos(\angle \mathrm{DCH}_2) = 6 \cdot \frac{19}{36} = \frac{19}{6}$ 이다.
이때 높이 $h = \overline{\mathrm{DH}_2} = \sqrt{\overline{\mathrm{CD}}^2 - \overline{\mathrm{CH}_2}^2} = \sqrt{36 - \frac{361}{36}} = \sqrt{\frac{935}{36}}$ 이다.

3. **[단계 3] 선분 $\mathrm{BH}_1$과 $\overline{\mathrm{AB}}$ 계산**
점 $\mathrm{A}$에서 선분 $\mathrm{BC}$에 내린 수선의 발이 $\mathrm{H}_1$이므로 $\overline{\mathrm{H}_1\mathrm{H}_2} = \overline{\mathrm{AD}} = 3$ 이다.
따라서 $\overline{\mathrm{BH}_1} = \overline{\mathrm{BC}} - \overline{\mathrm{H}_1\mathrm{H}_2} - \overline{\mathrm{CH}_2}$
$= 9 - 3 - \frac{19}{6} = 6 - \frac{19}{6} = \frac{17}{6}$ 이다.
직각삼각형 $\mathrm{ABH}_1$에서 피타고라스의 정리를 적용하면,
$\overline{\mathrm{AB}}^2 = \overline{\mathrm{AH}_1}^2 + \overline{\mathrm{BH}_1}^2$
이때 $\overline{\mathrm{AH}_1} = \overline{\mathrm{DH}_2} = h$ 이므로,
$\overline{\mathrm{AB}}^2 = h^2 + \left(\frac{17}{6}\right)^2 = \frac{935}{36} + \frac{289}{36} = \frac{1224}{36} = 34$ 이다.
따라서 선분 $\mathrm{AB}$의 길이는 $\sqrt{34}$ 이다.

[정답] 4
---
[ref] 86쪽 [서술형 완성하기] 문제 4 삼각함수 - 사인법칙과 코사인법칙 서술형 완성하기
[문제]
4 (2분)
삼각형 $\mathrm{ABC}$의 세 변의 길이를 각각 $a, b, c$라 하자. 삼각형 $\mathrm{ABC}$가 다음 조건을 만족시킨다.

(가) $b \cos \mathrm{B} + c \cos \mathrm{C} = a \cos \mathrm{A}$
(나) $b$와 $c$는 $x$에 대한 이차방정식 $x^2 - 16x + k = 0$ 의 서로 다른 두 실근이다.

삼각형 $\mathrm{ABC}$의 내접원의 넓이가 $4\pi$일 때, 상수 $k$의 값을 구하는 과정을 다음 단계에 따라 서술하시오.

[단계 1] 사인법칙과 코사인법칙을 적용하여 조건 (가)를 만족시키는 삼각형 $\mathrm{ABC}$가 어떤 삼각형인지 판별한다.
[단계 2] 조건 (나)의 근과 계수의 관계와 내접원의 반지름의 길이를 이용하여 세 변 $a, b, c$ 사이의 관계식을 유도한다.
[단계 3] 유도한 관계식의 정수해 조건을 활용하여 $b, c$의 값을 구하고 상수 $k$의 값을 구한다.

① 52
② 56
③ 60
④ 64
⑤ 68
[해설]
[풀이]
1. **[단계 1] 삼각형의 종류 판별**
조건 (가)에 사인법칙 $a=2R\sin \mathrm{A}, b=2R\sin \mathrm{B}, c=2R\sin \mathrm{C}$를 대입하면,
$\sin \mathrm{B}\cos \mathrm{B} + \sin \mathrm{C}\cos \mathrm{C} = \sin \mathrm{A}\cos \mathrm{A}$
배각 공식(또는 삼각비 변형)에 의해,
$\sin 2\mathrm{B} + \sin 2\mathrm{C} = \sin 2\mathrm{A}$
$2\sin(\mathrm{B}+\mathrm{C})\cos(\mathrm{B}-\mathrm{C}) = 2\sin \mathrm{A}\cos \mathrm{A}$
삼각형에서 $\sin(\mathrm{B}+\mathrm{C}) = \sin(180^{\circ}-\mathrm{A}) = \sin \mathrm{A}$ 이고 $\sin \mathrm{A} \neq 0$ 이므로 양변을 나누면,
$\cos(\mathrm{B}-\mathrm{C}) = \cos \mathrm{A} = \cos(180^{\circ}-(\mathrm{B}+\mathrm{C})) = -\cos(\mathrm{B}+\mathrm{C})$
$\cos(\mathrm{B}-\mathrm{C}) + \cos(\mathrm{B}+\mathrm{C}) = 0$
$2\cos \mathrm{B}\cos \mathrm{C} = 0 \implies \cos \mathrm{B}=0$ 또는 $\cos \mathrm{C}=0$ 이다.
따라서 삼각형 $\mathrm{ABC}$는 $\angle \mathrm{B}=90^{\circ}$ 또는 $\angle \mathrm{C}=90^{\circ}$ 인 직각삼각형이다.

2. **[단계 2] 세 변의 관계식 유도**
일반성을 잃지 않고 $\angle \mathrm{B}=90^{\circ}$ 라 하자. 빗변은 $b$이고 피타고라스 정리에 의해 $b^2 = a^2 + c^2$ 이 성립한다.
삼각형 $\mathrm{ABC}$의 내접원 넓이가 $4\pi$이므로 내접원 반지름 $r=2$ 이다.
직각삼각형의 내접원 반지름 공식에 의해,
$r = \frac{a+c-b}{2} = 2 \implies a = b-c+4$ 이다.
이를 피타고라스 공식 $b^2 = a^2 + c^2$ 에 대입하여 정리하면,
$b^2 = (b-c+4)^2 + c^2$
$b^2 = b^2 + c^2 + 16 - 2bc + 8b - 8c + c^2$
$2c^2 - 2bc + 8b - 8c + 16 = 0 \implies c(c-b) - 4(c-b) + 8 = 0$
$(c-4)(b-c) = 8$ 이 도출된다.

3. **[단계 3] 상수 $k$의 값 구하기**
빗변 $b$가 다른 한 변 $c$보다 길므로 $b-c>0$ 이고, 이에 따라 $c-4>0 \implies c>4$ 이다.
곱해서 8이 되는 자연수 쌍 $(c-4, b-c)$는
$(1, 8) \implies c=5, b-c=8 \implies b=13$ (합 $b+c=18$)
$(2, 4) \implies c=6, b-c=4 \implies b=10$ (합 $b+c=16$)
$(4, 2) \implies c=8, b-c=2 \implies b=10$ (합 $b+c=18$)
$(8, 1) \implies c=12, b-c=1 \implies b=13$ (합 $b+c=25$)
조건 (나)에서 이차방정식의 근과 계수의 관계에 의해 두 근의 합 $b+c=16$ 이므로, 유효한 해는 $c=6, b=10$ (또는 대칭적으로 $c=10, b=6$) 이다.
따라서 상수 $k = bc = 10 \times 6 = 60$ 이다.

[정답] 3
---
<!-- BATCH:9 END -->
<!-- BATCH:10 START -->
---
[ref] 86쪽 [서술형 완성하기] 문제 5 삼각함수 - 사인법칙과 코사인법칙 서술형 완성하기
[문제]
5 (2분)
선분 $\mathrm{AB}$와 선분 $\mathrm{AC}$의 길이는 $6$ 이고 $\angle \mathrm{BAC} = 120^{\circ}$ 인 이등변삼각형 $\mathrm{ABC}$가 있다. 선분 $\mathrm{AB}$를 $2 : 1$로 내분하는 점을 $\mathrm{D}$, 선분 $\mathrm{AC}$를 $2 : 1$로 내분하는 점을 $\mathrm{E}$라 할 때, $\cos(\angle \mathrm{ADE}) \cdot \cos(\angle \mathrm{AED})$의 값을 구하는 과정을 다음 단계에 따라 서술하시오.

[단계 1] 삼각형 $\mathrm{ADE}$의 세 변 $\mathrm{AD, AE, DE}$의 길이를 각각 구한다.
[단계 2] 코사인법칙을 적용하여 $\cos(\angle \mathrm{ADE})$와 $\cos(\angle \mathrm{AED})$의 값을 각각 구한다.
[단계 3] 두 코사인값의 곱을 구하고 분수 형태로 나타낸다.

① $\frac{1}{4}$
② $\frac{1}{2}$
③ $\frac{3}{4}$
④ $1$
⑤ $\frac{5}{4}$
[해설]
[풀이]
1. **[단계 1] 세 변의 길이 구하기**
점 $\mathrm{D}$와 점 $\mathrm{E}$는 각각 선분 $\mathrm{AB}$와 $\mathrm{AC}$를 $2:1$로 내분하므로,
$\overline{\mathrm{AD}} = 6 \times \frac{2}{3} = 4$
$\overline{\mathrm{AE}} = 6 \times \frac{2}{3} = 4$ 이다.
삼각형 $\mathrm{ADE}$에서 $\overline{\mathrm{AD}}=\overline{\mathrm{AE}}=4$ 이고 끼인각 $\angle \mathrm{DAE} = 120^{\circ}$ 이므로, 코사인법칙에 의해
$\overline{\mathrm{DE}}^2 = \overline{\mathrm{AD}}^2 + \overline{\mathrm{AE}}^2 - 2 \cdot \overline{\mathrm{AD}} \cdot \overline{\mathrm{AE}} \cos 120^{\circ}$
$= 4^2 + 4^2 - 2 \cdot 4 \cdot 4 \left(-\frac{1}{2}\right) = 16 + 16 + 16 = 48$
따라서 $\overline{\mathrm{DE}} = 4\sqrt{3}$ 이다.

2. **[단계 2] $\cos(\angle \mathrm{ADE})$와 $\cos(\angle \mathrm{AED})$ 구하기**
삼각형 $\mathrm{ADE}$는 $\overline{\mathrm{AD}}=\overline{\mathrm{AE}}=4$ 인 이등변삼각형이므로, 두 밑각의 크기는 같다.
$\angle \mathrm{ADE} = \angle \mathrm{AED} = \frac{180^{\circ} - 120^{\circ}}{2} = 30^{\circ}$ 이다.
따라서,
$\cos(\angle \mathrm{ADE}) = \cos 30^{\circ} = \frac{\sqrt{3}}{2}$
$\cos(\angle \mathrm{AED}) = \cos 30^{\circ} = \frac{\sqrt{3}}{2}$ 이다.

3. **[단계 3] 두 코사인값의 곱 계산**
$\cos(\angle \mathrm{ADE}) \cdot \cos(\angle \mathrm{AED}) = \frac{\sqrt{3}}{2} \cdot \frac{\sqrt{3}}{2} = \frac{3}{4}$ 이다.

[정답] 3
---
[ref] 86쪽 [서술형 완성하기] 문제 6 삼각함수 - 사인법칙과 코사인법칙 서술형 완성하기
[문제]
6 (2분)
원 $O$에 내접하는 사각형 $\mathrm{ABCD}$가 있다. $\angle \mathrm{BAD} = 120^{\circ}$, $\overline{\mathrm{AB}} + \overline{\mathrm{AD}} = 12$, $\overline{\mathrm{BC}} + \overline{\mathrm{CD}} = 12\sqrt{3}$ 이고 대각선 $\overline{\mathrm{BD}}$의 길이는 $6\sqrt{3}$ 이다. 사각형 $\mathrm{ABCD}$의 넓이를 구하는 과정을 다음 단계에 따라 서술하시오.

[단계 1] 삼각형 $\mathrm{ABD}$에서 선분 길이의 곱 $\overline{\mathrm{AB}} \cdot \overline{\mathrm{AD}}$를 구하고, 삼각형 $\mathrm{ABD}$의 넓이를 구한다.
[단계 2] 사각형 $\mathrm{ABCD}$가 원에 내접하는 성질을 활용하여 $\angle \mathrm{BCD}$의 크기를 구하고, 삼각형 $\mathrm{BCD}$에서 선분 길이의 곱 $\overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}}$와 삼각형 $\mathrm{BCD}$의 넓이를 구한다.
[단계 3] 두 삼각형의 넓이를 더하여 사각형 $\mathrm{ABCD}$의 넓이를 구한다.

① $28\sqrt{3}$
② $32\sqrt{3}$
③ $36\sqrt{3}$
④ $40\sqrt{3}$
⑤ $44\sqrt{3}$
[해설]
[풀이]
1. **[단계 1] 삼각형 $\mathrm{ABD}$의 넓이 구하기**
삼각형 $\mathrm{ABD}$에서 코사인법칙을 적용하면,
$\overline{\mathrm{BD}}^2 = \overline{\mathrm{AB}}^2 + \overline{\mathrm{AD}}^2 - 2 \cdot \overline{\mathrm{AB}} \cdot \overline{\mathrm{AD}} \cos 120^{\circ}$
$(6\sqrt{3})^2 = (\overline{\mathrm{AB}} + \overline{\mathrm{AD}})^2 - 2\overline{\mathrm{AB}} \cdot \overline{\mathrm{AD}} - 2\overline{\mathrm{AB}} \cdot \overline{\mathrm{AD}} \left(-\frac{1}{2}\right)$
$108 = (\overline{\mathrm{AB}} + \overline{\mathrm{AD}})^2 - \overline{\mathrm{AB}} \cdot \overline{\mathrm{AD}}$
여기에 $\overline{\mathrm{AB}} + \overline{\mathrm{AD}} = 12$를 대입하면,
$108 = 12^2 - \overline{\mathrm{AB}} \cdot \overline{\mathrm{AD}}$
$108 = 144 - \overline{\mathrm{AB}} \cdot \overline{\mathrm{AD}} \implies \overline{\mathrm{AB}} \cdot \overline{\mathrm{AD}} = 36$ 이다.
따라서 삼각형 $\mathrm{ABD}$의 넓이 $S_1$은
$S_1 = \frac{1}{2} \cdot \overline{\mathrm{AB}} \cdot \overline{\mathrm{AD}} \sin 120^{\circ} = \frac{1}{2} \cdot 36 \cdot \frac{\sqrt{3}}{2} = 9\sqrt{3}$ 이다.

2. **[단계 2] 삼각형 $\mathrm{BCD}$의 넓이 구하기**
사각형 $\mathrm{ABCD}$가 원 $O$에 내접하므로 마주 보는 두 대각의 합은 $180^{\circ}$ 이다.
$\angle \mathrm{BCD} = 180^{\circ} - \angle \mathrm{BAD} = 180^{\circ} - 120^{\circ} = 60^{\circ}$ 이다.
삼각형 $\mathrm{BCD}$에서 코사인법칙을 적용하면,
$\overline{\mathrm{BD}}^2 = \overline{\mathrm{BC}}^2 + \overline{\mathrm{CD}}^2 - 2 \cdot \overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}} \cos 60^{\circ}$
$(6\sqrt{3})^2 = (\overline{\mathrm{BC}} + \overline{\mathrm{CD}})^2 - 2\overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}} - 2\overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}} \left(\frac{1}{2}\right)$
$108 = (\overline{\mathrm{BC}} + \overline{\mathrm{CD}})^2 - 3\overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}}$
여기에 $\overline{\mathrm{BC}} + \overline{\mathrm{CD}} = 12\sqrt{3}$을 대입하면,
$108 = (12\sqrt{3})^2 - 3\overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}}$
$108 = 432 - 3\overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}} \implies 3\overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}} = 324 \implies \overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}} = 108$ 이다.
따라서 삼각형 $\mathrm{BCD}$의 넓이 $S_2$는
$S_2 = \frac{1}{2} \cdot \overline{\mathrm{BC}} \cdot \overline{\mathrm{CD}} \sin 60^{\circ} = \frac{1}{2} \cdot 108 \cdot \frac{\sqrt{3}}{2} = 27\sqrt{3}$ 이다.

3. **[단계 3] 사각형 $\mathrm{ABCD}$의 넓이 계산**
사학형 $\mathrm{ABCD}$의 넓이 $S$는 두 삼각형의 넓이의 합이다.
$S = S_1 + S_2 = 9\sqrt{3} + 27\sqrt{3} = 36\sqrt{3}$ 이다.

[정답] 3
---
<!-- BATCH:10 END -->
<!-- BATCH:11 START -->
---
[ref] 87쪽 [내신 + 수능 고난도 도전] 문제 1 (삼각함수 - 사인법칙과 코사인법칙)
[문제]
01 (2분)
원 $O$에 내접하고 꼭짓점이 시계 방향으로 $A, B, C, D$인 사각형 $ABCD$가 있다. 선분 $AB$의 길이는 $5$, 선분 $AD$의 길이는 $3$이고, 대각선 $AC$는 $\angle BAD$를 이등분한다. 사각형 $ABCD$의 넓이가 $8\sqrt{5}$일 때, 원 $O$의 반지름의 길이를 $R$이라 하자. $20R^2$의 값은?
① $185$
② $187$
③ $189$
④ $191$
⑤ $193$
[해설]
[풀이]
$\angle BAC = \angle CAD = \theta$라 하자. 
원주각의 성질에 의해 $\angle BAC$와 $\angle CAD$에 대한 현의 길이는 같으므로 $\overline{BC} = \overline{CD} = k$라 둘 수 있다.
사각형 $ABCD$의 넓이는 삼각형 $ABC$와 삼각형 $ADC$의 넓이의 합이므로,
$\frac{1}{2} \cdot \overline{AB} \cdot \overline{AC} \sin\theta + \frac{1}{2} \cdot \overline{AD} \cdot \overline{AC} \sin\theta = 8\sqrt{5}$
$\frac{1}{2} \cdot 5 \cdot \overline{AC} \sin\theta + \frac{1}{2} \cdot 3 \cdot \overline{AC} \sin\theta = 4 \overline{AC} \sin\theta = 8\sqrt{5}$ 이다.
따라서 $\overline{AC} \sin\theta = 2\sqrt{5}$ 이다.

이제 코사인법칙을 삼각형 $ABC$와 삼각형 $ADC$에 각각 적용하면,
$k^2 = 5^2 + \overline{AC}^2 - 2 \cdot 5 \cdot \overline{AC} \cos\theta = 25 + \overline{AC}^2 - 10\overline{AC} \cos\theta$
$k^2 = 3^2 + \overline{AC}^2 - 2 \cdot 3 \cdot \overline{AC} \cos\theta = 9 + \overline{AC}^2 - 6\overline{AC} \cos\theta$
두 식을 연립하여 빼면,
$0 = 16 - 4\overline{AC} \cos\theta \implies \overline{AC} \cos\theta = 4$ 이다.

구해낸 두 식의 양변을 제곱하여 더하면,
$\overline{AC}^2 \sin^2\theta + \overline{AC}^2 \cos^2\theta = (2\sqrt{5})^2 + 4^2$
$\overline{AC}^2 (\sin^2\theta + \cos^2\theta) = 20 + 16 = 36$
따라서 $\overline{AC} = 6$ 이고, 이를 대입하면 $\cos\theta = \frac{4}{6} = \frac{2}{3}$, $\sin\theta = \frac{\sqrt{5}}{3}$ 이다.

$k^2$의 식에 대입하여 $\overline{BC}$의 길이를 구하면,
$k^2 = 25 + 36 - 60 \cdot \frac{2}{3} = 61 - 40 = 21 \implies k = \sqrt{21}$ 이다.

마지막으로 삼각형 $ABC$에서 사인법칙을 적용하면,
$2R = \frac{\overline{BC}}{\sin\theta} = \frac{\sqrt{21}}{\frac{\sqrt{5}}{3}} = \frac{3\sqrt{21}}{\sqrt{5}}$ 이다.
따라서 $R^2 = \frac{9 \times 21}{4 \times 5} = \frac{189}{20}$ 이므로 $20R^2 = 189$ 이다.
[정답] 3
---
[ref] 87쪽 [내신 + 수능 고난도 도전] 문제 2 (삼각함수 - 사인법칙과 코사인법칙)
[문제]
02 (4분)
반지름의 길이가 $5$인 원 $O$에 내접하는 삼각형 $ABC$가 있다. 세 각 $A, B, C$의 대변의 길이를 각각 $a, b, c$라 할 때, 다음 조건을 만족시킨다.

(가) $\sin 2A + \sin 2B = \sin 2C$
(나) $a > b > c$

삼각형 $ABC$의 둘레의 길이가 $24$일 때, $25 \sin B \cos C$ 의 값은?
① $12$
② $14$
③ $16$
④ $18$
⑤ $20$
[해설]
[풀이]
(가) 조건의 $\sin 2A = 2\sin A \cos A$ 임을 이용하고, 사인법칙 $\sin A = \frac{a}{2R}$ 와 코사인법칙을 결합하여 식을 전개해본다. (배각의 법칙을 알지 못해도 코사인법칙 연립으로 증명 가능하지만, 삼각형의 내각 성질을 이용하는 것이 우아하다.)
식 $\sin 2A + \sin 2B = \sin 2C$ 에서,
만약 $\angle A = 90^\circ$ 라면, $B+C=90^\circ$ 이므로 $2C = 180^\circ - 2B$ 이다.
그러면 $\sin 2C = \sin(180^\circ - 2B) = \sin 2B$ 가 되어 $\sin 180^\circ + \sin 2B = \sin 2B$ 로 등식이 완벽히 성립한다.
수학 1 교과 과정의 대수적 전개로 이를 확인하면,
$2 \cdot \frac{a}{2R} \cdot \frac{b^2+c^2-a^2}{2bc} + 2 \cdot \frac{b}{2R} \cdot \frac{a^2+c^2-b^2}{2ac} = 2 \cdot \frac{c}{2R} \cdot \frac{a^2+b^2-c^2}{2ab}$
양변에 $4Rabc$를 곱하여 정리하면,
$a^2(b^2+c^2-a^2) + b^2(a^2+c^2-b^2) = c^2(a^2+b^2-c^2)$
이를 전개하여 소거하면 $a^4 - 2a^2b^2 + b^4 = c^4$ 이 도출되며, $(a^2-b^2)^2 = (c^2)^2$ 이 된다.
따라서 $a^2-b^2 = c^2$ 또는 $a^2-b^2 = -c^2$ 이므로 $a^2 = b^2+c^2$ 또는 $b^2 = a^2+c^2$ 이다.
즉 $\angle A = 90^\circ$ 이거나 $\angle B = 90^\circ$ 인 직각삼각형이다.
(나) 조건에서 $a > b > c$ 이므로 가장 긴 빗변은 $a$가 되어야 하며, 따라서 $\angle A = 90^\circ$ 로 유일하게 확정된다.

외접원 반지름 $R=5$ 이므로 빗변 $a = 2R = 10$ 이다.
삼각형의 둘레가 $24$ 이므로 $a+b+c = 24 \implies b+c = 14$ 이다.
직각삼각형이므로 $b^2+c^2 = a^2 = 100$ 이다.
$(b+c)^2 = b^2+c^2+2bc \implies 196 = 100 + 2bc \implies bc = 48$ 이다.
$b+c=14$ 와 $bc=48$ 을 만족하는 두 변은 근과 계수의 관계에 의해 $6$ 과 $8$ 이다.
$b > c$ 이므로 $b=8, c=6$ 이다.

직각삼각형 $ABC$ 에서 $\sin B = \frac{b}{a} = \frac{8}{10} = \frac{4}{5}$ 이다.
코사인법칙의 의미 상 $\angle C$의 이웃변은 $b$ 이므로 $\cos C = \frac{b}{a} = \frac{4}{5}$ 이다.
따라서 $25 \sin B \cos C = 25 \times \frac{4}{5} \times \frac{4}{5} = 16$ 이다.
[팁]
삼각함수의 배각 공식을 수학 1의 사인/코사인법칙으로 치환하여 대수적으로 깎아내는 논리는 매우 고전적이면서도 강력한 출제 기법입니다. $\sin 2A$ 형태를 만나면 주저 없이 이 법칙들을 대입해보는 연습이 필요합니다.
[정답] 3
---
[ref] 87쪽 [내신 + 수능 고난도 도전] 문제 3 (삼각함수 - 사인법칙과 코사인법칙)
[문제]
03 (2분)
삼각형 $ABC$가 다음 조건을 만족시킨다.

(가) $\sqrt{2}\sin B = \sin C$
(나) $\cos B = \sqrt{2}\cos C$

각 $A$를 삼등분하는 두 직선 중 선분 $AB$에 가까운 직선이 선분 $BC$와 만나는 점을 $D$라 할 때, $\frac{\overline{CD}^2}{\overline{BD}^2}$ 의 값은?
① $\frac{1}{2}$
② $1$
③ $\frac{3}{2}$
④ $2$
⑤ $\frac{5}{2}$
[해설]
[풀이]
(가)에서 사인법칙에 의해 변의 길이 비로 전환하면 $\sqrt{2}b = c$ 이다.
이 결과를 (나)의 코사인법칙 식에 대입한다.
$\frac{a^2+c^2-b^2}{2ac} = \sqrt{2} \frac{a^2+b^2-c^2}{2ab}$
좌변의 $c$ 자리에 $\sqrt{2}b$ 를 대입하면,
$\frac{a^2+2b^2-b^2}{2a(\sqrt{2}b)} = \sqrt{2} \frac{a^2+b^2-2b^2}{2ab}$
양변을 정리하면,
$\frac{a^2+b^2}{2\sqrt{2}ab} = \frac{\sqrt{2}(a^2-b^2)}{2ab}$
양변에 $2\sqrt{2}ab$ 를 곱하여 분모를 소거하면,
$a^2+b^2 = 2(a^2-b^2) \implies a^2 = 3b^2$ 이다.
이때 $b^2+c^2 = b^2 + (\sqrt{2}b)^2 = 3b^2 = a^2$ 이 성립하므로, 삼각형 $ABC$는 $\angle A = 90^\circ$ 인 직각삼각형이다.

점 $D$는 $\angle A = 90^\circ$ 를 삼등분하는 선 중 선분 $AB$에 가까운 선이므로 $\angle BAD = 30^\circ$, $\angle CAD = 60^\circ$ 가 된다.
삼각형 $ABD$와 삼각형 $ACD$의 넓이 비는 밑변의 길이 비인 $\overline{BD} : \overline{CD}$ 와 같다.
$\frac{\overline{BD}}{\overline{CD}} = \frac{\triangle ABD}{\triangle ACD} = \frac{\frac{1}{2} \cdot c \cdot \overline{AD} \sin 30^\circ}{\frac{1}{2} \cdot b \cdot \overline{AD} \sin 60^\circ}$
$= \frac{c \sin 30^\circ}{b \sin 60^\circ} = \frac{\sqrt{2}b \cdot \frac{1}{2}}{b \cdot \frac{\sqrt{3}}{2}} = \frac{\sqrt{2}}{\sqrt{3}}$ 이다.

따라서 $\frac{\overline{CD}}{\overline{BD}} = \frac{\sqrt{3}}{\sqrt{2}}$ 이고, 이를 제곱하면 $\frac{\overline{CD}^2}{\overline{BD}^2} = \frac{3}{2}$ 이다.
[정답] 3
---
<!-- BATCH:11 END -->
<!-- BATCH:12 START -->
---
[ref] 88쪽 [내신 + 수능 고난도 도전] 문제 4 삼각함수 - 사인법칙과 코사인법칙 내신 + 수능 고난도 도전
[문제]
04 (4분)
원 $O$에 내접하고 $\cos(\angle \mathrm{BAC}) = -\frac{1}{4}$ 인 삼각형 $\mathrm{ABC}$가 있다. 원 $O$의 반지름의 길이는 $4$ 이고, 선분 $\mathrm{BC}$를 $1 : 2$로 내분하는 점을 $\mathrm{D}$라 하자. 선분 $\mathrm{AD}$의 연장선이 원 $O$와 만나는 점 중 $\mathrm{A}$가 아닌 점을 $\mathrm{E}$라 할 때, 두 현 $\mathrm{BE}$와 $\mathrm{CE}$의 길이가 서로 같다. 선분 $\mathrm{AD}$의 길이는?

① $\frac{\sqrt{15}}{3}$
② $\frac{2\sqrt{15}}{3}$
③ $\sqrt{15}$
④ $\frac{4\sqrt{15}}{3}$
⑤ $\frac{5\sqrt{15}}{3}$
[해설]
[풀이]
1. **외접원의 반지름과 선분 $\mathrm{BC}$의 길이 계산**
원 $O$의 반지름 $R = 4$ 이고 $\cos(\angle \mathrm{BAC}) = -\frac{1}{4}$ 이다.
$\angle \mathrm{BAC}$는 둔각이므로 $\sin(\angle \mathrm{BAC}) = \sqrt{1 - \cos^2(\angle \mathrm{BAC})} = \sqrt{1 - \frac{1}{16}} = \frac{\sqrt{15}}{4}$ 이다.
사인법칙에 의해,
$\overline{\mathrm{BC}} = 2R \sin(\angle \mathrm{BAC}) = 2 \cdot 4 \cdot \frac{\sqrt{15}}{4} = 2\sqrt{15}$ 이다.

2. **호의 길이 대칭성을 이용한 $\angle \mathrm{BAC}$의 이등분선 성질 도출**
두 현 $\mathrm{BE}$와 $\mathrm{CE}$의 길이가 같으므로, 그에 대한 호 $\mathrm{BE}$와 호 $\mathrm{CE}$의 길이도 같다.
따라서 이 호들에 대한 원주각 $\angle \mathrm{BAE}$와 $\angle \mathrm{CAE}$의 크기가 같다.
즉, 선분 $\mathrm{AE}$는 $\angle \mathrm{BAC}$의 이등분선이다.
각의 이등분선의 성질에 의해,
$\overline{\mathrm{AB}} : \overline{\mathrm{AC}} = \overline{\mathrm{BD}} : \overline{\mathrm{CD}} = 1 : 2$ 이다.
$\overline{\mathrm{AB}} = c$, $\overline{\mathrm{AC}} = 2c$ ($c>0$)라 하자.

3. **코사인법칙을 통한 두 변의 길이 확정**
삼각형 $\mathrm{ABC}$에서 코사인법칙을 적용하면,
$\overline{\mathrm{BC}}^2 = \overline{\mathrm{AB}}^2 + \overline{\mathrm{AC}}^2 - 2 \cdot \overline{\mathrm{AB}} \cdot \overline{\mathrm{AC}} \cos(\angle \mathrm{BAC})$
$(2\sqrt{15})^2 = c^2 + (2c)^2 - 2 \cdot c \cdot 2c \cdot \left(-\frac{1}{4}\right)$
$60 = 5c^2 + c^2 = 6c^2 \implies c^2 = 10 \implies c = \sqrt{10}$ 이다.
따라서 $\overline{\mathrm{AB}} = \sqrt{10}$, $\overline{\mathrm{AC}} = 2\sqrt{10}$ 이다.

4. **선분 $\mathrm{AD}$의 길이 계산**
$\overline{\mathrm{BC}} = 2\sqrt{15}$ 이고 $\overline{\mathrm{BD}} : \overline{\mathrm{CD}} = 1 : 2$ 이므로,
$\overline{\mathrm{BD}} = \frac{2\sqrt{15}}{3}$, $\overline{\mathrm{CD}} = \frac{4\sqrt{15}}{3}$ 이다.
각의 이등분선의 길이 공식에 의해 다음이 성립한다.
$\overline{\mathrm{AD}}^2 = \overline{\mathrm{AB}} \cdot \overline{\mathrm{AC}} - \overline{\mathrm{BD}} \cdot \overline{\mathrm{CD}}$
$\overline{\mathrm{AD}}^2 = \sqrt{10} \cdot 2\sqrt{10} - \frac{2\sqrt{15}}{3} \cdot \frac{4\sqrt{15}}{3} = 20 - \frac{40}{3} = \frac{20}{3}$ 이다.
따라서 $\overline{\mathrm{AD}} = \sqrt{\frac{20}{3}} = \frac{2\sqrt{15}}{3}$ 이다.

[정답] 2
---
[ref] 88쪽 [내신 + 수능 고난도 도전] 문제 5 삼각함수 - 사인법칙과 코사인법칙 내신 + 수능 고난도 도전
[문제]
05 (2분)
선분 $\mathrm{AB}$의 길이는 $5$, 선분 $\mathrm{BC}$의 길이는 $8$, 선분 $\mathrm{AC}$의 길이는 $7$ 인 삼각형 $\mathrm{ABC}$가 있다. 삼각형 $\mathrm{ABC}$의 내접원이 세 변 $\mathrm{AB, BC, CA}$와 만나는 점을 각각 $\mathrm{D, E, F}$라 하고, 선분 $\mathrm{EF}$의 길이를 $L$이라 할 때, $14L^2$의 값을 구하시오.

① 110
② 130
③ 150
④ 170
⑤ 190
[해설]
[풀이]
1. **내접원의 성질을 이용한 접점 분할 길이 계산**
삼각형 $\mathrm{ABC}$의 꼭짓점 $\mathrm{C}$에서 내접원과 만나는 두 접점 $\mathrm{E, F}$까지의 거리를 $x$라 하면,
$\overline{\mathrm{CE}} = \overline{\mathrm{CF}} = x$ 이다.
$\overline{\mathrm{AB}} = c = 5$, $\overline{\mathrm{BC}} = a = 8$, $\overline{\mathrm{AC}} = b = 7$ 이다.
둘레의 절반을 $s = \frac{a+b+c}{2} = \frac{8+7+5}{2} = 10$ 이라 할 때,
꼭짓점 $\mathrm{C}$에서의 접점 분할 길이는
$\overline{\mathrm{CE}} = \overline{\mathrm{CF}} = s - c = 10 - 5 = 5$ 이다.

2. **코사인법칙을 이용한 $\cos \mathrm{C}$ 계산**
삼각형 $\mathrm{ABC}$에서 코사인법칙을 적용하면,
$\cos \mathrm{C} = \frac{a^2 + b^2 - c^2}{2ab} = \frac{8^2 + 7^2 - 5^2}{2 \cdot 8 \cdot 7} = \frac{64 + 49 - 25}{112} = \frac{88}{112} = \frac{11}{14}$ 이다.

3. **이등변삼각형 $\mathrm{CEF}$에서 선분 $\mathrm{EF}$의 길이 계산**
삼각형 $\mathrm{CEF}$는 $\overline{\mathrm{CE}} = \overline{\mathrm{CF}} = 5$ 인 이등변삼각형이다.
코사인법칙을 적용하면,
$L^2 = \overline{\mathrm{EF}}^2 = \overline{\mathrm{CE}}^2 + \overline{\mathrm{CF}}^2 - 2 \cdot \overline{\mathrm{CE}} \cdot \overline{\mathrm{CF}} \cos \mathrm{C}$
$L^2 = 5^2 + 5^2 - 2 \cdot 5 \cdot 5 \cdot \frac{11}{14} = 50 - \frac{275}{7} = \frac{75}{7}$ 이다.
따라서,
$14L^2 = 14 \cdot \frac{75}{7} = 150$ 이다.

[정답] 3
---
[ref] 88쪽 [내신 + 수능 고난도 도전] 문제 6 삼각함수 - 사인법칙과 코사인법칙 내신 + 수능 고난도 도전
[문제]
06 (2분)
예각삼각형 $\mathrm{ABC}$가 있다. 선분 $\mathrm{AB}$를 지름으로 하는 원이 선분 $\mathrm{AC}$와 만나는 점 중 $\mathrm{A}$가 아닌 점을 $\mathrm{P}$, 선분 $\mathrm{BC}$를 지름으로 하는 원이 선분 $\mathrm{AB}$와 만나는 점 중 $\mathrm{B}$가 아닌 점을 $\mathrm{Q}$라 하자. 선분 $\mathrm{AB}$의 길이는 $6$, 선분 $\mathrm{BC}$의 길이는 $8$ 이고 $\cos(\angle \mathrm{ABC}) = \frac{1}{4}$ 일 때, 선분 $\mathrm{PQ}$의 길이는?

① $\frac{12\sqrt{19}}{19}$
② $\frac{14\sqrt{19}}{19}$
③ $\frac{16\sqrt{19}}{19}$
④ $\frac{18\sqrt{19}}{19}$
⑤ $\frac{20\sqrt{19}}{19}$
[해설]
[풀이]
1. **수선의 발 성질 도출**
선분 $\mathrm{AB}$가 지름이므로 $\angle \mathrm{APB} = 90^{\circ}$ 이다. 즉, $\mathrm{BP} \perp \mathrm{AC}$ 이며 점 $\mathrm{P}$는 점 $\mathrm{B}$에서 선분 $\mathrm{AC}$에 내린 수선의 발이다.
선분 $\mathrm{BC}$가 지름이므로 $\angle \mathrm{BQC} = 90^{\circ}$ 이다. 즉, $\mathrm{CQ} \perp \mathrm{AB}$ 이며 점 $\mathrm{Q}$는 점 $\mathrm{C}$에서 선분 $\mathrm{AB}$에 내린 수선의 발이다.

2. **코사인법칙을 통한 선분 $\mathrm{AC}$의 길이 계산**
삼각형 $\mathrm{ABC}$에서 코사인법칙을 적용하면,
$\overline{\mathrm{AC}}^2 = \overline{\mathrm{AB}}^2 + \overline{\mathrm{BC}}^2 - 2 \cdot \overline{\mathrm{AB}} \cdot \overline{\mathrm{BC}} \cos(\angle \mathrm{ABC})$
$= 6^2 + 8^2 - 2 \cdot 6 \cdot 8 \cdot \frac{1}{4} = 36 + 64 - 24 = 76$
$\overline{\mathrm{AC}} = 2\sqrt{19}$ 이다.

3. **코사인법칙을 통한 $\cos \mathrm{A}$의 계산**
삼각형 $\mathrm{ABC}$에서 $\cos \mathrm{A}$를 구하면,
$\cos \mathrm{A} = \frac{\overline{\mathrm{AB}}^2 + \overline{\mathrm{AC}}^2 - \overline{\mathrm{BC}}^2}{2 \cdot \overline{\mathrm{AB}} \cdot \overline{\mathrm{AC}}}$
$= \frac{6^2 + 76 - 8^2}{2 \cdot 6 \cdot 2\sqrt{19}} = \frac{36+76-64}{24\sqrt{19}} = \frac{48}{24\sqrt{19}} = \frac{2}{\sqrt{19}}$ 이다.

4. **삼각형의 닮음을 이용한 선분 $\mathrm{PQ}$의 길이 계산**
$\angle \mathrm{APB} = \angle \mathrm{AQC} = 90^{\circ}$ 이므로,
직각삼각형 $\mathrm{ABP}$에서 $\overline{\mathrm{AP}} = \overline{\mathrm{AB}} \cos \mathrm{A}$ 이고,
직각삼각형 $\mathrm{ACQ}$에서 $\overline{\mathrm{AQ}} = \overline{\mathrm{AC}} \cos \mathrm{A}$ 이다.
따라서 $\frac{\overline{\mathrm{AP}}}{\overline{\mathrm{AB}}} = \frac{\overline{\mathrm{AQ}}}{\overline{\mathrm{AC}}} = \cos \mathrm{A}$ 이고 $\angle \mathrm{A}$를 공통으로 가지므로,
$\triangle \mathrm{APQ} \sim \triangle \mathrm{ABC}$ (SAS 닮음)이다.
이때 닮음비는 $\cos \mathrm{A}$ 이다.
따라서,
$\overline{\mathrm{PQ}} = \overline{\mathrm{BC}} \cos \mathrm{A} = 8 \cdot \frac{2}{\sqrt{19}} = \frac{16}{\sqrt{19}} = \frac{16\sqrt{19}}{19}$ 이다.

[정답] 3
---
<!-- BATCH:12 END -->
