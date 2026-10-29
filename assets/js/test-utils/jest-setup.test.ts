/// <reference types="jest" />

describe('jest setup', () => {
  it('AC1: loads the jest-dom matchers for every test', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    expect(element).toBeInTheDocument()
  })
})
