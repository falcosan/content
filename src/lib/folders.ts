import type { AssetFolder } from '#types/api'
import type { FolderNode } from '#types/app'

export const flattenFolders = (folders: AssetFolder[]): FolderNode[] => {
    const ids = new Set(folders.map(({ id }) => id))
    const children = Map.groupBy(folders, ({ parentId }) =>
        parentId !== null && ids.has(parentId) ? parentId : null
    )
    const walk = (parentId: number | null, depth: number): FolderNode[] =>
        (children.get(parentId) ?? []).flatMap((folder) => [
            { ...folder, depth },
            ...walk(folder.id, depth + 1),
        ])
    return walk(null, 0)
}

export const folderIndent = (depth: number) => '— '.repeat(depth)

export const folderLabel = ({ name, depth }: FolderNode) => `${folderIndent(depth)}${name}`
