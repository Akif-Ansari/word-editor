import React from 'react'
import type { RenderElementProps } from 'slate-react'
import {
    ParagraphEl,
    HeadingEl,
    BlockquoteEl,
    CodeBlockEl,
    BulletedListEl,
    NumberedListEl,
    ListItemEl,
    ChecklistItemEl,
    LinkEl,
    ImageEl,
    VideoEl,
    TableEl,
    TableRowEl,
    TableCellEl,
    DividerEl,
    PageBreakEl,
} from './Elements'

export function renderElement(props: RenderElementProps): React.ReactElement {
    switch (props.element.type) {
        case 'paragraph': return <ParagraphEl {...props} />
        case 'heading-one':
        case 'heading-two':
        case 'heading-three':
        case 'heading-four':
        case 'heading-five':
        case 'heading-six': return <HeadingEl {...props} />
        case 'blockquote': return <BlockquoteEl {...props} />
        case 'code-block': return <CodeBlockEl {...props} />
        case 'bulleted-list': return <BulletedListEl {...props} />
        case 'numbered-list': return <NumberedListEl {...props} />
        case 'list-item': return <ListItemEl {...props} />
        case 'checklist-item': return <ChecklistItemEl {...props} />
        case 'link': return <LinkEl {...props} />
        case 'image': return <ImageEl {...props} />
        case 'video': return <VideoEl {...props} />
        case 'table': return <TableEl {...props} />
        case 'table-row': return <TableRowEl {...props} />
        case 'table-cell': return <TableCellEl {...props} />
        case 'divider': return <DividerEl {...props} />
        case 'page-break': return <PageBreakEl {...props} />
        default: return <ParagraphEl {...props} />
    }
}
