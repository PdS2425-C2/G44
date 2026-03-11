import React from 'react';

const GroupsList = ({ groups }) => (
  // list-group-flush rimuove i bordi laterali e arrotondati
  <div className="list-group list-group-flush w-100">
    {groups.map((g) => (
      <div 
        key={g.id} 
        // list-group-item-action aggiunge l'effetto grigio al passaggio del mouse
        className="list-group-item list-group-item-action d-flex align-items-center p-3 border-bottom border-0"
        style={{ cursor: 'pointer' }}
      >
        
        {/* Avatar Placeholder: ho racchiuso le tue icone in un cerchio stile mockup */}
        <div 
          className="d-flex justify-content-center align-items-center bg-light text-dark rounded-circle me-3 flex-shrink-0"
          style={{ width: '48px', height: '48px' }}
        >
          <i className={`bi ${g.is_group ? 'bi-people-fill' : 'bi-person-fill'} fs-5`}></i>
        </div>

        {/* Area Testo: Nome e Data (al posto dell'ultimo messaggio, come richiesto) */}
        <div className="flex-grow-1 overflow-hidden">
          <h6 className="mb-1 fw-semibold text-truncate">
            {g.name}
          </h6>
          <p className="mb-0 text-muted small text-truncate">
            Creato il {new Date(g.created_at).toLocaleString()}
          </p>
        </div>

      </div>
    ))}
  </div>
);

export default GroupsList;