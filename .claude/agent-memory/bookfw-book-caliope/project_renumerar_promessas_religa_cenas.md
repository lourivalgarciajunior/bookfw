---
name: renumerar-promessas-religa-cenas
description: reescrever as promessas do PD com a mesma numeracao faz os `promessas:` antigos das cenas passarem a apontar para promessas novas, e o validate conta como plantio
metadata:
  type: project
---

Quando o PD é replanejado e as promessas são renumeradas, o `bookfw validate` casa só pelo ID (P1, P2...). Contrato de cena escrito sobre o plano antigo com `promessas: [P1, P3, P6]` passa a "plantar" as promessas novas de mesmo número, sem que a cena tenha nada delas. O aviso muda de "nao aparece em nenhuma cena" para "plantada e nunca paga" e parece progresso.

Medido em 2026-09-13 no replanejamento de felizes-apesar-do-feed (cap 01 com contratos antigos).

**Why:** o gate não compara texto da promessa com a cena; a numeração é o único elo.

**How to apply:** ao entregar PD replanejado, liste no handoff os capítulos cujos `promessas:`/`paga:` foram escritos sobre a numeração antiga e peça que sejam zerados ou refeitos. Relaciona-se com [[project_mapa_promessas_sem_gate]].
