import { Link } from 'react-router-dom'
import { useShop } from '@/store'
import type { Product } from '@/types'
import './product-card.css'

export default function ProductCard({ p, index = 0 }: { p: Product; index?: number }) {
  const saved = useShop((s) => s.saved.includes(p.id))
  const toggleSave = useShop((s) => s.toggleSave)
  const add = useShop((s) => s.add)

  return (
    <article className="pcard rise" style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}>
      <Link to={`/product/${p.id}`} className="pcard-media">
        <img src={p.image} alt={p.name} loading="lazy" />
        <button
          className={`pcard-save ${saved ? 'on' : ''}`}
          aria-label={saved ? `Remove ${p.name} from saved` : `Save ${p.name}`}
          aria-pressed={saved}
          onClick={(e) => { e.preventDefault(); toggleSave(p.id) }}
        >
          <Heart filled={saved} />
        </button>
        <div className="pcard-quick">
          <button className="btn small block" onClick={(e) => { e.preventDefault(); add(p) }}>
            Add to bag
          </button>
        </div>
      </Link>

      <div className="pcard-body">
        <p className="pcard-brand">{p.brand}</p>
        <h3 className="pcard-name"><Link to={`/product/${p.id}`}>{p.name}</Link></h3>
        <div className="pcard-foot">
          <span className="price">${p.price}</span>
          <span className="pcard-color">
            <i style={{ background: p.color }} aria-hidden />
            {p.colorName}
          </span>
        </div>
      </div>
    </article>
  )
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
      <path d="M12 20.5S3.8 15 3.8 9.4A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.2 2.6c0 5.6-8.2 11.1-8.2 11.1Z" strokeLinejoin="round" />
    </svg>
  )
}
