import React from 'react';

const GroupsList = ({ groups, onSelectGroup }) => (
  
  <div className="list-group list-group-flush w-100">
    {groups.map((g) => (
      <div 
        key={g.id} 
        className="list-group-item list-group-item-action d-flex align-items-center p-3 border-bottom border-0"
        style={{ cursor: 'pointer' }}
        onClick={() => onSelectGroup?.(g)}
      >
        
        <div 
          className="d-flex justify-content-center align-items-center bg-light text-dark rounded-circle me-3 flex-shrink-0"
          style={{ width: '48px', height: '48px' }}
        >
          <i className={`bi ${g.is_group ? 'bi-people-fill' : 'bi-person-fill'} fs-5`}></i>
        </div>

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