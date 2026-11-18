import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, Minus, Plus, Search, ShoppingBag, X } from 'lucide-react'
import { collections, information, price, products, type Collection, type Product } from './catalog'

type BagItem = { id: string; color: string; quantity: number }
type Panel = 'search' | 'bag' | 'menu' | keyof typeof information
const navigation = [['Главная', '#home'], ['Коллекции', '#collections'], ['Новинки', '#new-arrivals'], ['О бренде', '#about']]
const bagKey = 'velora-bag'
const image = (name: string) => `${import.meta.env.BASE_URL}images/${name}.webp`

function savedBag(): BagItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(bagKey) || '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is BagItem => item && Number.isInteger(item.quantity) && item.quantity > 0 &&
      products.some(product => product.id === item.id && product.colors.some(color => color.id === item.color)))
  } catch {
    return []
  }
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    const trigger = document.activeElement
    element.showModal()
    element.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
    document.body.classList.add('dialog-open')
    return () => {
      element.close()
      document.body.classList.remove('dialog-open')
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog className="drawer" ref={dialog} aria-labelledby="panel-title" onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="drawer-inner">
        <div className="drawer-head">
          <h2 id="panel-title">{title}</h2>
          <button className="icon-button" aria-label="Закрыть окно" onClick={onClose}><X size={23} /></button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

function ProductCard({ product, add }: { product: Product; add: (id: string, color: string) => void }) {
  const [color, setColor] = useState(product.colors[0].id)
  const selectedColor = product.colors.find(option => option.id === color)!.name
  const [added, setAdded] = useState(false)
  const reset = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(reset.current), [])

  function addToBag() {
    add(product.id, color)
    setAdded(true)
    window.clearTimeout(reset.current)
    reset.current = window.setTimeout(() => setAdded(false), 1600)
  }

  return (
    <article className="product">
      <div className="product-photo">
        <img src={image(product.id)} alt={product.alt} width="520" height="650" loading="lazy" />
        <img className="product-detail" src={image(product.id + '-detail')} alt="" width="520" height="650" loading="lazy" />
        <button className="product-add" onClick={addToBag} aria-label={`В корзину: ${product.name}, ${selectedColor}`}>
          <span>{added ? 'Добавлено' : 'В корзину'}</span><Plus size={16} />
        </button>
      </div>
      <div className="product-info"><h3>{product.name}</h3><span>{price(product.price)}</span></div>
      <div className="swatches" role="group" aria-label={`Цвета: ${product.name}`}>
        {product.colors.map(option => (
          <button key={option.id} type="button" aria-label={option.name} aria-pressed={color === option.id} title={option.name}
            onClick={() => { setColor(option.id); setAdded(false) }}><span style={{ backgroundColor: option.value }} /></button>
        ))}
      </div>
    </article>
  )
}

export function App() {
  const [activeSection, setActiveSection] = useState('#home')
  const [collection, setCollection] = useState<Collection | 'All'>('All')
  const [panel, setPanel] = useState<Panel | null>(null)
  const [query, setQuery] = useState('')
  const [bag, setBag] = useState<BagItem[]>([])
  const [bagReady, setBagReady] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [email, setEmail] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState('')
  useEffect(() => { setBag(savedBag()); setBagReady(true) }, [])
  useEffect(() => {
    if (!bagReady) return
    try { localStorage.setItem(bagKey, JSON.stringify(bag)) } catch { /* The bag remains usable in memory. */ }
  }, [bag, bagReady])

  useEffect(() => {
    function syncHash() { setActiveSection(location.hash || '#home') }
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        if (!motion.matches) entry.target.animate(
          [{ opacity: 0.45, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 650, easing: 'cubic-bezier(.2,.65,.3,1)' },
        )
        observer.unobserve(entry.target)
      }
    }, { threshold: 0.1 })
    document.querySelectorAll('[data-reveal]').forEach(element => {
      if (element.getBoundingClientRect().top > innerHeight) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])

  function updateBag(id: string, color: string, delta: number) {
    setBag(items => {
      const existing = items.find(item => item.id === id && item.color === color)
      if (!existing && delta > 0) return [...items, { id, color, quantity: delta }]
      return items.map(item => item === existing ? { ...item, quantity: item.quantity + delta } : item)
        .filter(item => item.quantity > 0)
    })
    if (delta > 0) {
      const product = products.find(item => item.id === id)!
      const selectedColor = product.colors.find(option => option.id === color)!.name
      setAnnouncement(`Добавлено в корзину: ${product.name}, ${selectedColor}.`)
    }
  }

  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      localStorage.setItem('velora-newsletter', email.trim())
      setNewsletterMessage('Подписка сохранена в этом браузере. Добро пожаловать в VÉLORA!')
      setEmail('')
    } catch {
      setNewsletterMessage('Не удалось сохранить подписку. Проверьте настройки хранения данных в браузере и попробуйте снова.')
    }
  }

  function openSearch() { setQuery(''); setPanel('search') }
  const close = () => setPanel(null)
  const count = bag.reduce((total, item) => total + item.quantity, 0)
  const subtotal = bag.reduce((total, item) => total + products.find(product => product.id === item.id)!.price * item.quantity, 0)
  const visibleProducts = products.filter(product => collection === 'All' || product.collections.includes(collection))
  const normalizedQuery = query.trim().toLowerCase().replaceAll('ё', 'е')
  const searchResults = products.filter(product =>
    `${product.name} ${product.collections.join(' ')}`.toLowerCase().replaceAll('ё', 'е').includes(normalizedQuery),
  )

  return (
    <>
      <a className="skip" href="#main">Перейти к содержимому</a>
      <div id="home"></div>
      <header className="header">
        <div className="header-shell">
          <button className="icon-button menu-toggle" aria-label="Открыть меню" onClick={() => setPanel('menu')}><Menu size={22} /></button>
          <a className="wordmark" href="#home" aria-label="VÉLORA — главная">VÉLORA<span>.</span></a>
          <nav className="desktop-nav" aria-label="Основная навигация">
            {navigation.map(([label, href]) => <a href={href} key={label} aria-current={activeSection === href ? 'location' : undefined}>{label}</a>)}
          </nav>
          <div className="header-actions">
            <button className="icon-button" aria-label="Поиск по каталогу" onClick={openSearch}><Search size={19} /></button>
            <button className="icon-button bag-button" aria-label={`Корзина, количество вещей: ${count}`} onClick={() => setPanel('bag')}>
              <ShoppingBag size={19} /><span aria-hidden="true">{count}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-title">
          <picture className="hero-media">
            <source media="(max-width: 767px)" srcSet={image('hero-mobile')} />
            <img src={image('hero')} alt="Две модели в тёмных пальто у бетонного фасада" width="1900" height="792" fetchPriority="high" />
          </picture>
          <div className="hero-shade"></div>
          <div className="shell hero-inner">
            <div className="hero-copy">
              <p className="eyebrow hero-kicker"><span></span> Осень / зима 2026</p>
              <h1 id="hero-title"><span>СТИЛЬ БЕЗ</span><em>ГРАНИЦ.</em></h1>
              <p className="hero-description">Новый взгляд на повседневную одежду.<br className="hero-break" /> Для тех, кто движется в своём ритме.</p>
              <a className="button button-light" href="#collections">Смотреть коллекции <ArrowUpRight size={16} /></a>
            </div>
            <div className="hero-foot">
              <a href="#collections"><ArrowDown size={15} /> Листайте дальше</a>
            </div>
          </div>
        </section>

        <section className="section shell collections" id="collections">
          <header className="section-heading" data-reveal>
            <p className="eyebrow">Коллекции</p>
            <h2>Гардероб для <em>вашего ритма</em></h2>
          </header>
          <div className="collection-grid" data-reveal>
            {collections.map(item => (
              <a className="collection" href="#new-arrivals" key={item.name} onClick={() => setCollection(item.name)}>
                <div className="collection-image"><img src={image(item.image)} alt={item.alt} width="620" height="775" loading="lazy" /></div>
                <div className="collection-caption"><div><h3>{item.name}</h3><p>{item.description}</p></div><span className="circle-arrow"><ArrowUpRight size={19} /></span></div>
              </a>
            ))}
          </div>
        </section>

        <section className="section arrivals" id="new-arrivals">
          <div className="shell">
            <header className="arrivals-heading" data-reveal>
              <div><p className="eyebrow">Новинки</p><h2>Только <em>поступили</em></h2></div>
              <div className="filters" role="group" aria-label="Фильтр по коллекциям">
                {(['All', ...collections.map(item => item.name)] as const).map(item => <button key={item} onClick={() => setCollection(item)} aria-pressed={collection === item}>{item === 'All' ? 'Все' : item}</button>)}
              </div>
            </header>
            <div className="product-grid" data-reveal>
              {visibleProducts.map(product => <ProductCard key={product.id} product={product} add={(id, color) => updateBag(id, color, 1)} />)}
            </div>
            <div className="center-action">
              <button className="button button-outline" onClick={openSearch}>Смотреть все вещи <ArrowUpRight size={16} /></button>
            </div>
          </div>
        </section>

        <section className="story" id="about">
          <div className="story-photo">
            <img src={image('story')} alt="Модель в свободном тёмном пальто и светлых брюках на бетонных ступенях" width="1120" height="560" loading="lazy" />
          </div>
          <div className="story-copy" data-reveal>
            <p className="eyebrow">Философия бренда</p>
            <h2>Больше, чем<br /> <em>просто одежда.</em></h2>
            <p>В VÉLORA мы верим, что одежда помогает выразить себя. В каждой вещи мы соединяем комфорт, характер и эстетику вне времени.</p>
            <button className="text-link" onClick={() => setPanel('История бренда')}>История бренда <ArrowUpRight size={16} /></button>
          </div>
        </section>

        <section className="campaign" id="campaign" aria-labelledby="campaign-title">
          <img className="campaign-photo" src={image('campaign')} alt="Две модели в длинных пальто идут по площади среди модернистских зданий" width="1900" height="792" loading="lazy" />
          <div className="campaign-shade"></div>
          <div className="campaign-copy shell" data-reveal>
            <p className="eyebrow">Кампания «Осень / зима»</p>
            <h2 id="campaign-title">ИСКУССТВО <em>БЫТЬ СОБОЙ</em></h2>
            <button className="button button-light" onClick={() => setPanel('Искусство быть собой')}>Смотреть кампанию <ArrowUpRight size={16} /></button>
          </div>
        </section>

        <section className="newsletter" id="newsletter">
          <div className="shell newsletter-inner" data-reveal>
            <div><p className="eyebrow">Рассылка VÉLORA</p><h2>Первыми узнавайте <em>о новом.</em></h2>
              <p>Узнавайте о новых коллекциях, эксклюзивных выпусках и историях VÉLORA.</p>
            </div>
            <form onSubmit={subscribe}>
              <label className="visually-hidden" htmlFor="email">Электронная почта</label>
              <div className="newsletter-input">
                <input id="email" type="email" autoComplete="email" placeholder="Ваш email" value={email}
                  onChange={event => { setEmail(event.target.value); setNewsletterMessage('') }} required aria-describedby="newsletter-privacy newsletter-status" />
                <button type="submit">Подписаться <ArrowRight size={16} /></button>
              </div>
              <p id="newsletter-privacy">Пробная подписка хранится на этом устройстве. <button type="button" onClick={() => setPanel('Политика конфиденциальности')}>Политика конфиденциальности</button></p>
              <p id="newsletter-status" role="status">{newsletterMessage}</p>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell">
          <div className="footer-grid">
            <div className="footer-brand"><a href="#home" className="wordmark" aria-label="VÉLORA — главная">VÉLORA<span>.</span></a><p>Создавайте свой стиль.<br />Современная одежда для самовыражения.</p><a href="mailto:hello@velora.example">hello@velora.example</a></div>
            <nav aria-label="Каталог"><h2>Каталог</h2><a href="#collections">Коллекции</a><a href="#new-arrivals" onClick={() => setCollection('All')}>Новинки</a><a href="#campaign">Кампания</a></nav>
            <nav aria-label="Покупателям"><h2>Покупателям</h2><button onClick={() => setPanel('Доставка и возврат')}>Доставка и возврат</button><a href="mailto:hello@velora.example">Связаться с нами</a></nav>
            <nav aria-label="Социальные сети"><h2>Соцсети</h2><a href="https://www.instagram.com/">Instagram <ArrowUpRight size={12} /></a><a href="https://www.pinterest.com/">Pinterest <ArrowUpRight size={12} /></a><a href="https://www.tiktok.com/">TikTok <ArrowUpRight size={12} /></a></nav>
          </div>
          <div className="footer-bottom"><span>© 2026 VÉLORA. Все права защищены.</span><div><button onClick={() => setPanel('Политика конфиденциальности')}>Политика конфиденциальности</button><button onClick={() => setPanel('Условия использования')}>Условия использования</button></div></div>
        </div>
      </footer>

      <p className="visually-hidden" role="status" key={announcement + count}>{announcement}</p>

      {panel && <Modal title={panel === 'search' ? 'Каталог' : panel === 'bag' ? `Корзина (${count})` : panel === 'menu' ? 'Меню' : panel} onClose={close}>
        {panel === 'menu' && <nav className="mobile-nav" aria-label="Мобильная навигация">{navigation.map(([label, href]) =>
          <a key={label} href={href} onClick={close}>{label}<ArrowUpRight size={19} /></a>)}</nav>}
        {panel === 'search' && <>
          <label className="drawer-search"><Search size={20} /><input aria-label="Название вещи или коллекции" placeholder="Название вещи или коллекции" type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <p className="result-count" role="status">Найдено: {searchResults.length}</p>
          {searchResults.map(product => <div className="drawer-row" key={product.id}>
            <img src={image(product.id)} alt={product.alt} width="72" height="90" />
            <div><strong>{product.name}</strong><p>{price(product.price)} · {product.colors[0].name}</p></div>
            <button className="icon-button" aria-label={`В корзину: ${product.name}, ${product.colors[0].name}`} onClick={() => updateBag(product.id, product.colors[0].id, 1)}><Plus size={20} /></button>
          </div>)}
          {searchResults.length === 0 && <p>Попробуйте поискать по названию вещи или коллекции.</p>}
          {count > 0 && <button className="button button-outline drawer-action" onClick={() => setPanel('bag')}>Открыть корзину ({count}) <ArrowUpRight size={16} /></button>}
        </>}
        {panel === 'bag' && (bag.length ? <>
          {bag.map(item => {
            const product = products.find(entry => entry.id === item.id)!
            const color = product.colors.find(option => option.id === item.color)!.name
            return <div className="drawer-row" key={item.id + item.color}><img src={image(product.id)} alt={product.alt} width="72" height="90" />
              <div><strong>{product.name}</strong><p>{color} · {price(product.price)}</p>
              <div className="quantity"><button onClick={() => updateBag(item.id, item.color, -1)} aria-label={`Уменьшить количество: ${product.name}, ${color}`}><Minus size={14} /></button><span>{item.quantity}</span>
              <button onClick={() => updateBag(item.id, item.color, 1)} aria-label={`Увеличить количество: ${product.name}, ${color}`}><Plus size={14} /></button></div></div>
            </div>
          })}
          <p className="subtotal"><strong>Сумма</strong><strong>{price(subtotal)} USD</strong></p><p className="drawer-note">Это демонстрационная корзина.</p>
        </> : <p className="drawer-note">Ваша корзина пуста.</p>)}
        {panel in information && <>
          <p className="info-copy">{information[panel as keyof typeof information]}</p>
          {panel === 'Искусство быть собой' && <a className="button button-outline drawer-action" href="#new-arrivals" onClick={() => { setCollection('Новый сезон'); close() }}>Смотреть новый сезон <ArrowUpRight size={16} /></a>}
        </>}
      </Modal>}
    </>
  )
}
