<script setup lang="ts">
import { computed, ref } from 'vue'
import { EllipsisVertical, Plus, Share, SquarePlus, X } from 'lucide-vue-next'
import { t } from '@/i18n'
import { canInstallDirectly, installNow, markOffered, platform } from '@/composables/useInstall'

/*
 * How to keep this on a home screen, told differently depending on where it
 * is being read.
 *
 * On Android the browser will do the whole thing itself if it has offered to
 * - so where that offer exists there are no steps at all, just the button
 * that hands it back to the system. Instructions are what is left when the
 * platform refuses to help, which on iOS it always has.
 *
 * The pictures are drawn here rather than shipped as screenshots. A
 * screenshot is a photograph of one version of one browser in one language,
 * wrong within a year and wrong today for anybody whose phone is not in
 * English; these are diagrams of where to look, which age slowly and are
 * legible in both themes because they are made of the same tokens as
 * everything else.
 */
const dialog = ref<HTMLDialogElement | null>(null)

function open() {
  markOffered()
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

function backdropClick(event: MouseEvent) {
  if (event.target === dialog.value) close()
}

defineExpose({ open })

async function install() {
  await installNow()
  close()
}

/*
 * iOS keeps the share button in the toolbar at the foot of the screen -
 * Safari has always put it there, and Chrome's iOS toolbar sits at the
 * bottom too. Android's menu is the three dots at the top right. That is the
 * whole of the difference worth drawing.
 */
const shareAtBottom = computed(() => platform === 'ios')

const steps = computed(() => {
  if (platform === 'ios') {
    return [t.value.portal.stepShare, t.value.portal.stepAddHome, t.value.portal.stepConfirmAdd]
  }

  return [t.value.portal.stepMenu, t.value.portal.stepInstallApp]
})
</script>

<template>
  <dialog
    ref="dialog"
    aria-labelledby="install-heading"
    class="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-2xl border border-b-0 border-[var(--layer-line)] bg-[var(--card)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-foreground backdrop:bg-black/50 sm:mb-auto sm:rounded-2xl sm:border-b sm:pb-5"
    @click="backdropClick"
  >
    <div class="flex items-start justify-between gap-x-3">
      <div>
        <h2 id="install-heading" class="text-lg font-semibold">{{ t.portal.installHeading }}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{{ t.portal.installWhy }}</p>
      </div>

      <button
        type="button"
        class="-me-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--layer-hover)]"
        :aria-label="t.portal.close"
        @click="close"
      >
        <X class="size-5" aria-hidden="true" />
      </button>
    </div>

    <!-- Where the browser has offered to do it, nothing else needs saying. -->
    <template v-if="canInstallDirectly">
      <button
        type="button"
        class="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
        @click="install"
      >
        {{ t.portal.installNow }}
      </button>
    </template>

    <template v-else>
      <!-- A phone, drawn. The bar is where the button being talked about
           actually sits: the foot of the screen in Safari, the head of it in
           Chrome, which is the one thing somebody following this needs to
           get right. -->
      <div class="mt-5 flex justify-center">
        <div
          class="relative h-40 w-24 rounded-2xl border-2 border-[var(--layer-line)] bg-[var(--background)] p-1.5"
          aria-hidden="true"
        >
          <div
            class="absolute inset-x-1.5 flex h-7 items-center justify-center rounded-lg bg-[var(--layer-hover)]"
            :class="shareAtBottom ? 'bottom-1.5' : 'top-1.5'"
          >
            <span
              class="inline-flex size-6 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]"
            >
              <Share v-if="platform === 'ios'" class="size-3.5" />
              <EllipsisVertical v-else class="size-3.5" />
            </span>
          </div>

          <!-- Two grey lines standing in for whatever page is open. Any more
               detail would be pretending to be a screenshot. -->
          <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-1.5">
            <div class="h-1.5 rounded-full bg-[var(--border)]"></div>
            <div class="h-1.5 w-2/3 rounded-full bg-[var(--border)]"></div>
          </div>
        </div>
      </div>

      <!-- The menu that opens, with the one row that matters picked out. -->
      <div class="mt-4 flex justify-center" aria-hidden="true">
        <div
          class="w-56 overflow-hidden rounded-xl border border-[var(--layer-line)] bg-[var(--layer)]"
        >
          <div class="flex items-center gap-x-2 px-3 py-2 opacity-40">
            <span class="h-1.5 w-16 rounded-full bg-[var(--border)]"></span>
          </div>
          <div
            class="flex items-center gap-x-2 border-y-2 border-[var(--primary)] bg-[var(--layer-hover)] px-3 py-2 text-xs font-medium"
          >
            <SquarePlus v-if="platform === 'ios'" class="size-4 shrink-0" />
            <Plus v-else class="size-4 shrink-0" />
            {{ platform === 'ios' ? t.portal.stepAddHome : t.portal.stepInstallApp }}
          </div>
          <div class="flex items-center gap-x-2 px-3 py-2 opacity-40">
            <span class="h-1.5 w-20 rounded-full bg-[var(--border)]"></span>
          </div>
        </div>
      </div>

      <ol class="mt-5 space-y-2">
        <li v-for="(step, at) in steps" :key="step" class="flex items-start gap-x-3 text-sm">
          <span
            class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--layer-hover)] text-xs font-semibold"
            aria-hidden="true"
          >
            {{ at + 1 }}
          </span>
          {{ step }}
        </li>
      </ol>

      <p class="mt-4 text-xs text-muted-foreground">{{ t.portal.installWording }}</p>
    </template>

    <button
      type="button"
      class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg border border-[var(--layer-line)] px-4 text-sm font-medium hover:bg-[var(--layer-hover)]"
      @click="close"
    >
      {{ t.portal.installLater }}
    </button>
  </dialog>
</template>
