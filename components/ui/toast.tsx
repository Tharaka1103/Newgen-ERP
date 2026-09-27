"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const baseToast = ToastPrimitive.createToastManager()

const toast = Object.assign(baseToast, {
  create: (opts: { title?: string; description?: string; type?: string }) => {
    return baseToast.add({
      title: opts.title,
      description: opts.description,
      type: opts.type as any,
    })
  },
  success: (title: string, description?: string) =>
    baseToast.add({ title, description, type: "success" }),
  error: (title: string, description?: string) =>
    baseToast.add({ title, description, type: "error" }),
  warning: (title: string, description?: string) =>
    baseToast.add({ title, description, type: "warning" }),
  info: (title: string, description?: string) =>
    baseToast.add({ title, description, type: "info" }),
})

const ToastContext = React.createContext<{ type?: string }>({})

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-4 z-[99999] mx-auto w-auto max-w-sm outline-none sm:right-6 sm:bottom-6 sm:left-auto sm:mx-0 sm:w-full",
        className
      )}
      {...props}
    />
  )
}

function Toast({
  className,
  type,
  children,
  ...props
}: ToastPrimitive.Root.Props & { type?: string }) {
  const resolvedType = type || (props as any).toast?.type

  return (
    <ToastContext.Provider value={{ type: resolvedType }}>
      <ToastPrimitive.Root
        data-slot="toast"
        className={cn(
          "group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-2xl border shadow-xl will-change-transform outline-none select-none backdrop-blur-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          resolvedType === "success" &&
            "bg-emerald-50/95 text-emerald-950 border-emerald-400/70 shadow-emerald-500/10 dark:bg-zinc-950/95 dark:text-emerald-50 dark:border-emerald-500/40 dark:shadow-emerald-950/40",
          resolvedType === "error" &&
            "bg-rose-50/95 text-rose-950 border-rose-400/70 shadow-rose-500/10 dark:bg-zinc-950/95 dark:text-rose-50 dark:border-rose-500/40 dark:shadow-rose-950/40",
          resolvedType === "warning" &&
            "bg-amber-50/95 text-amber-950 border-amber-400/70 shadow-amber-500/10 dark:bg-zinc-950/95 dark:text-amber-50 dark:border-amber-500/40 dark:shadow-amber-950/40",
          resolvedType === "info" &&
            "bg-sky-50/95 text-sky-950 border-sky-400/70 shadow-sky-500/10 dark:bg-zinc-950/95 dark:text-sky-50 dark:border-sky-500/40 dark:shadow-sky-950/40",
          !resolvedType && "bg-popover/95 text-popover-foreground border-border shadow-lg",
          "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
          "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
          "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
          "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
          "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
          "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
          "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
          "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
          "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
          "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
          "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
          "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
          "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
          "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
          className
        )}
        {...props}
      >
        {children}
      </ToastPrimitive.Root>
    </ToastContext.Provider>
  )
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  const { type } = React.useContext(ToastContext)
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn(
        "text-sm font-semibold tracking-tight leading-snug",
        type === "success" && "text-emerald-950 dark:text-emerald-100",
        type === "error" && "text-rose-950 dark:text-rose-100",
        type === "warning" && "text-amber-950 dark:text-amber-100",
        type === "info" && "text-sky-950 dark:text-sky-100",
        !type && "text-foreground",
        className
      )}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  const { type } = React.useContext(ToastContext)
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn(
        "text-xs leading-relaxed",
        type === "success" && "text-emerald-800/90 dark:text-emerald-300/90",
        type === "error" && "text-rose-800/90 dark:text-rose-300/90",
        type === "warning" && "text-amber-800/90 dark:text-amber-300/90",
        type === "info" && "text-sky-800/90 dark:text-sky-300/90",
        !type && "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  )
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-xs" />,
  ...props
}: ToastPrimitive.Close.Props) {
  const { type } = React.useContext(ToastContext)
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      className={cn(
        "relative shrink-0 rounded-md p-1 transition-colors outline-none",
        type === "success" &&
          "text-emerald-700/60 hover:text-emerald-950 dark:text-emerald-400/60 dark:hover:text-emerald-100 hover:bg-emerald-500/10",
        type === "error" &&
          "text-rose-700/60 hover:text-rose-950 dark:text-rose-400/60 dark:hover:text-rose-100 hover:bg-rose-500/10",
        type === "warning" &&
          "text-amber-700/60 hover:text-amber-950 dark:text-amber-400/60 dark:hover:text-amber-100 hover:bg-amber-500/10",
        type === "info" &&
          "text-sky-700/60 hover:text-sky-950 dark:text-sky-400/60 dark:hover:text-sky-100 hover:bg-sky-500/10",
        !type && "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      {children ?? (
        <XIcon className="size-3.5" aria-hidden="true" />
      )}
    </ToastPrimitive.Close>
  )
}

function ToastIcon({ type: propType }: { type?: string }) {
  const context = React.useContext(ToastContext)
  const type = propType ?? context.type
  let icon: React.ReactNode = null

  if (type === "success") {
    icon = <CircleCheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
  } else if (type === "info") {
    icon = <InfoIcon className="size-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />;
  } else if (type === "warning") {
    icon = <TriangleAlertIcon className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
  } else if (type === "error") {
    icon = <OctagonXIcon className="size-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />;
  } else if (type === "loading") {
    icon = <Loader2Icon className="size-5 animate-spin text-primary" aria-hidden="true" />;
  }

  if (!icon) return null

  return (
    <span
      data-slot="toast-icon"
      className={cn(
        "shrink-0 flex items-center justify-center p-1 rounded-full",
        type === "success" && "bg-emerald-500/15 dark:bg-emerald-500/20",
        type === "error" && "bg-rose-500/15 dark:bg-rose-500/20",
        type === "warning" && "bg-amber-500/15 dark:bg-amber-500/20",
        type === "info" && "bg-sky-500/15 dark:bg-sky-500/20",
        !type && "bg-muted"
      )}
    >
      {icon}
    </span>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem} type={toastItem.type}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ))
}

function Toaster({
  children,
  toastManager = toast,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  )
}

const createToastManager = ToastPrimitive.createToastManager
const useToastManager = ToastPrimitive.useToastManager

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
}
