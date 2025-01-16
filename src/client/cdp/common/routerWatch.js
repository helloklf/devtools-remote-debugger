function getPageInfo() {
  return {
    url: location.href,
    title: document.title,
  }
}

export default function (callback) {
  const cb = () => callback(getPageInfo())
  window.addEventListener('popstate', cb)
  const observer = new MutationObserver((mutationList) => {
    mutationList.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.target.nodeName === 'TITLE') {
        callback(getPageInfo())
      }
    })
  })

  // Observe the changes of the document
  observer.observe(document.head, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  })

  return () => {
    window.removeEventListener('popstate', cb)
    observer.disconnect()
  }
}
