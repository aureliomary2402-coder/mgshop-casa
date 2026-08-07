// Timbro "Torna presto" da sovrapporre all'immagine di un prodotto momentaneamente
// non acquistabile. Va messo dentro un contenitore con position: relative.
// Lo stile dell'immagine sottostante va reso bianco e nero separatamente
// (style={{ filter: 'grayscale(1)' }} sull'<img>).
export function TornaPrestoStamp({ size = '65%' }: { size?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <img
        src="/images/torna-presto.png"
        alt="Torna presto"
        draggable={false}
        className="select-none drop-shadow-lg"
        style={{ width: size, height: 'auto' }}
      />
    </div>
  )
}
