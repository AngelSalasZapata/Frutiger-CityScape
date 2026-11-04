export const BUILD_TOOLS = ['select', 'place', 'move', 'rotate', 'duplicate', 'delete'] as const

export type BuildTool = (typeof BUILD_TOOLS)[number]

export const TOOL_LABELS: Readonly<Record<BuildTool, string>> = {
  select: 'Seleccionar',
  place: 'Colocar',
  move: 'Mover',
  rotate: 'Rotar',
  duplicate: 'Duplicar',
  delete: 'Eliminar',
}

export const TOOL_HINTS: Readonly<Record<BuildTool, string>> = {
  select: 'Clic en un objeto para inspeccionarlo.',
  place: 'Elegí un item y arrastrá para construir en serie.',
  move: 'Arrastrá un objeto a otra celda libre.',
  rotate: 'Clic en un objeto para girarlo 90°.',
  duplicate: 'Clic en un objeto para copiarlo cerca.',
  delete: 'Clic en un objeto para eliminarlo.',
}
