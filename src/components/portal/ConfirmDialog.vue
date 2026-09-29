<script setup lang="ts">
import { ref } from 'vue'
import { t } from '@/i18n'

/*
 * Are you sure, asked once, in the same shape everywhere.
 *
 * It replaces a pattern that looked cheaper and was not: a button whose label
 * turned into the question when it was pressed. That changes what the control
 * is called without telling anybody, so somebody listening to the page rather
 * than looking at it hears the same button twice and has no idea the first
 * press was a question. It also leaves nowhere to say what is about to
 * happen, which for half of these is the only thing worth saying.
 *
 * Opening one of these from inside another dialog is fine - the sheet that
 * holds the people list is itself a <dialog>, and a second one simply stacks
 * above it in the top layer.
 */
defineProps<{
  heading: string
  body?: string
  confirmLabel: string
  // Red, for the ones that cannot be taken back.
  danger?: boolean
}>()

const emit = defineEmits<{ confirm: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)

function open() {
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

// Nothing is typed in here, so a tap outside costs nothing and closing is
// the safe direction to fall.
function backdropClick(event: MouseEvent) {
  if (event.target === dialog.value) close()
}

function go() {
  close()
  emit('confirm')
}

defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    aria-labelledby="confirm-heading"
    aria-describedby="confirm-body"
    class="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-[var(--layer-line)] bg-[var(--card)] p-5 text-foreground backdrop:bg-black/50 sm:p-6"
    @click="backdropClick"
  >
    <h2 id="confirm-heading" class="text-lg font-semibold">{{ heading }}</h2>
    <p v-if="body" id="confirm-body" class="mt-2 text-sm text-muted-foreground">{{ body }}</p>

    <div class="mt-5 flex gap-3">
      <!-- First in the document, so this is what the dialog opens focused on.
           The other one is a decision, not a default. -->
      <button
        type="button"
        autofocus
        class="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)]"
        @click="close"
      >
        {{ t.portal.cancel }}
      </button>

      <button
        type="button"
        class="inline-flex h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-medium"
        :class="
          danger
            ? 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive-hover)]'
            : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]'
        "
        @click="go"
      >
        {{ confirmLabel }}
      </button>
    </div>
  </dialog>
</template>
