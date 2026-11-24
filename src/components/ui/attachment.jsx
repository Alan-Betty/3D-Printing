import * as React from "react"
import { FileText, Image as ImageIcon, Box, Trash2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const Attachment = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
))
Attachment.displayName = "Attachment"

const AttachmentList = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", className)} {...props} />
))
AttachmentList.displayName = "AttachmentList"

const AttachmentItem = React.forwardRef(
  ({ className, name, size, type = "file", previewUrl, onRemove, ...props }, ref) => {
    const isModel = type === "model" || name?.toLowerCase().endsWith(".stl") || name?.toLowerCase().endsWith(".3mf")
    const isImage = type === "image" || Boolean(previewUrl)

    const formatSize = (bytes) => {
      if (!bytes) return ""
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between gap-2.5 rounded-lg border border-slate-800 bg-[#090d16] p-2 text-xs transition-colors hover:border-slate-700",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={name}
              className="h-9 w-9 rounded object-cover border border-slate-800 shrink-0"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-900 border border-slate-800 text-cyan">
              {isModel ? (
                <Box className="h-4 w-4 text-[#ff5e1e]" />
              ) : isImage ? (
                <ImageIcon className="h-4 w-4 text-cyan" />
              ) : (
                <FileText className="h-4 w-4 text-slate-400" />
              )}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-white truncate text-xs">{name}</div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <span>{isModel ? "3D Mesh (STL/3MF)" : isImage ? "Photo" : "Document"}</span>
              {size ? <span>· {formatSize(size)}</span> : null}
            </div>
          </div>
        </div>

        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            onClick={onRemove}
            className="text-slate-400 hover:text-destructive hover:bg-destructive/10 shrink-0"
            title="Remove attachment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    )
  }
)
AttachmentItem.displayName = "AttachmentItem"

const AttachmentUpload = React.forwardRef(
  ({ className, title, description, accept, onFilesSelected, multiple = true, icon: Icon = Upload, ...props }, ref) => {
    const inputRef = React.useRef(null)

    const handleChange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(e.target.files)
        e.target.value = ""
      }
    }

    return (
      <div
        ref={ref}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-800 bg-[#090d16]/60 p-4 text-center cursor-pointer transition-colors hover:border-slate-700 hover:bg-[#090d16]",
          className
        )}
        {...props}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-cyan mb-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-xs font-medium text-slate-200">{title}</div>
        {description && (
          <div className="text-[10.5px] text-slate-500 mt-0.5">{description}</div>
        )}
      </div>
    )
  }
)
AttachmentUpload.displayName = "AttachmentUpload"

export { Attachment, AttachmentList, AttachmentItem, AttachmentUpload }
